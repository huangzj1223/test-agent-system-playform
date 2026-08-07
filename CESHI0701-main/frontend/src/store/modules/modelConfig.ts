/**
 * 模型配置 Store
 * 供应商配置与模型均落后端数据库，本 store 负责拉取、缓存与增删改的编排。
 * apiKey 不下发前端（仅 hasApiKey 标识），仅在新增/更新时明文上送后端加密存储。
 * 「当前聊天模型选择」为非敏感的本机偏好，仍存 localStorage。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  loadCurrentSelection,
  saveCurrentSelection,
  loadCachedConfigs,
  saveCachedConfigs
} from '@/services/modelConfigStorage'
import { fetchChatSetting, saveChatSetting } from '@/api/agentSetting'
import {
  fetchAllWithModels,
  addProvider,
  updateProvider,
  deleteProvider,
  addModel as apiAddModel,
  updateModel as apiUpdateModel,
  deleteModel as apiDeleteModel
} from '@/api/modelConfig'
import type {
  ModelProviderConfig,
  ModelConfig,
  ModelProvider,
  CurrentModelSelection,
  ProtocolType,
  AvailableModel,
  AvailableModelGroup,
  ChatRequestParams,
  ProviderOption
} from '@/types/model'

/** 供应商下拉选项 */
export const PROVIDER_OPTIONS: ProviderOption[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'openai-compatible', label: '自定义 OpenAI 兼容接口' }
]

/** 协议类型下拉选项 */
export const PROTOCOL_OPTIONS: { value: ProtocolType; label: string }[] = [
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'custom', label: 'Custom' }
]

/** 草稿配置的哨兵 ID（尚未落库，保存时走新增） */
export const DRAFT_CONFIG_ID = 0

/**
 * 由 API 地址推断供应商与协议类型（新增模型自动建连接时使用）。
 * 匹配不到时回退为 openai-compatible，用户可在保存后调整。
 * @param endpoint API 地址
 */
export function inferProviderFromEndpoint(endpoint: string): {
  provider: ModelProvider
  protocolType: ProtocolType
} {
  const url = (endpoint || '').toLowerCase()
  if (url.includes('anthropic')) return { provider: 'anthropic', protocolType: 'anthropic' }
  if (url.includes('azure')) return { provider: 'azure-openai', protocolType: 'azure-openai' }
  if (url.includes('deepseek')) return { provider: 'deepseek', protocolType: 'openai-compatible' }
  if (url.includes('openrouter')) return { provider: 'openrouter', protocolType: 'openai-compatible' }
  if (url.includes('openai')) return { provider: 'openai', protocolType: 'openai-compatible' }
  return { provider: 'openai-compatible', protocolType: 'openai-compatible' }
}

/** 构造一个未落库的草稿配置（保存后由后端分配真实 id） */
function buildDraftConfig(sort: number): ModelProviderConfig {
  return {
    id: DRAFT_CONFIG_ID,
    name: '新配置',
    provider: 'openai',
    apiEndpoint: '',
    hasApiKey: false,
    protocolType: 'openai-compatible',
    apiVersion: '',
    remark: '',
    enabled: true,
    sort,
    models: []
  }
}

export const useModelConfigStore = defineStore('modelConfigStore', () => {
  /** 全部供应商配置（含各自模型列表，来自后端） */
  const configs = ref<ModelProviderConfig[]>([])
  /** 配置管理页左侧当前选中的配置 ID */
  const activeConfigId = ref<number | null>(null)
  /** 当前聊天使用的模型选择（本机偏好，存 localStorage） */
  const currentSelection = ref<CurrentModelSelection | null>(null)
  /** 是否已初始化 */
  const initialized = ref(false)

  /** 当前选中的配置对象 */
  const activeConfig = computed(
    () => configs.value.find((c) => c.id === activeConfigId.value) || null
  )

  /** 可用模型（配置启用 + 模型启用），扁平列表 */
  const availableModels = computed<AvailableModel[]>(() => {
    const list: AvailableModel[] = []
    configs.value
      .filter((c) => c.enabled)
      .forEach((c) => {
        c.models
          .filter((m) => m.enabled)
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .forEach((m) => list.push({ providerConfigId: c.id, providerLabel: c.name, model: m }))
      })
    return list
  })

  /** 可用模型按供应商分组 */
  const availableModelGroups = computed<AvailableModelGroup[]>(() =>
    configs.value
      .filter((c) => c.enabled)
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((c) => ({
        providerConfigId: c.id,
        providerLabel: c.name,
        models: c.models.filter((m) => m.enabled).slice().sort((a, b) => a.sort - b.sort)
      }))
      .filter((g) => g.models.length > 0)
  )

  /** 是否存在可用模型 */
  const hasAvailableModel = computed(() => availableModels.value.length > 0)

  /** 当前选择对应的可用模型（失效返回 null） */
  const currentModel = computed<AvailableModel | null>(() => {
    if (!currentSelection.value) return null
    return (
      availableModels.value.find(
        (a) =>
          a.providerConfigId === currentSelection.value!.providerConfigId &&
          a.model.id === currentSelection.value!.modelId
      ) || null
    )
  })

  /** 从后端拉取全部配置及其模型（单请求聚合接口，消除逐供应商查模型的 N+1 串行往返） */
  const loadAll = async (): Promise<void> => {
    const res = await fetchAllWithModels()
    configs.value = (res.data?.list || []).map(
      (c) => ({ ...c, models: c.models || [] }) as ModelProviderConfig
    )
    // 落本机缓存，供下次首屏 stale-while-revalidate 快速回填
    saveCachedConfigs(configs.value)
    // 校正左侧选中项
    if (!configs.value.some((c) => c.id === activeConfigId.value)) {
      activeConfigId.value = configs.value[0]?.id ?? null
    }
    ensureValidSelection()
  }

  /**
   * 初始化：加载后端配置 + 恢复主用模型选择。
   * 主用选择以后端（按用户、跨设备）为准，localStorage 仅作首屏快速回填缓存；
   * 后端读取失败时静默回退本机缓存，不阻断模型配置加载。
   */
  const init = async (): Promise<void> => {
    if (initialized.value) return
    // 先用本机缓存快速回填，避免首屏等待后端
    currentSelection.value = loadCurrentSelection()
    // 缓存命中则立即回填模型列表，使下拉瞬间渲染；随后 loadAll 后台刷新覆盖为最新（stale-while-revalidate）
    const cached = loadCachedConfigs()
    if (cached && cached.length > 0) {
      configs.value = cached
      if (!configs.value.some((c) => c.id === activeConfigId.value)) {
        activeConfigId.value = configs.value[0]?.id ?? null
      }
      ensureValidSelection()
    }
    try {
      await loadAll()
      // 后端选择为权威值：读取成功且有效则覆盖本机缓存
      await syncSelectionFromBackend()
      initialized.value = true
    } catch (e) {
      ElMessage.error((e as Error)?.message || '加载模型配置失败，请稍后重试')
    }
  }

  /**
   * 从后端聊天设置读取主用模型选择并校正。
   * 后端有有效选择则采用并同步本机缓存；无选择或读取失败则保留 loadAll 的校正结果。
   */
  const syncSelectionFromBackend = async (): Promise<void> => {
    try {
      const res = await fetchChatSetting()
      const remote = res.data?.currentModel
      if (
        remote &&
        availableModels.value.some(
          (a) => a.providerConfigId === remote.providerConfigId && a.model.id === remote.modelId
        )
      ) {
        currentSelection.value = { providerConfigId: remote.providerConfigId, modelId: remote.modelId }
        saveCurrentSelection(currentSelection.value)
      }
    } catch {
      // 后端不可用时保留本机缓存/校正结果，不打断初始化
    }
  }

  /** 将当前选择持久化到后端（失败静默，不影响本机已生效的选择） */
  const persistSelectionToBackend = (selection: CurrentModelSelection | null): void => {
    saveChatSetting({ currentModel: selection }).catch(() => {
      // 后端保存失败不阻断使用，下次进入以本机缓存回退
    })
  }

  /** 设置配置管理页当前选中配置 */
  const setActiveConfig = (id: number) => {
    activeConfigId.value = id
  }

  /** 新增一个草稿配置（本地，未落库；保存时才创建后端记录） */
  const addConfig = (): ModelProviderConfig => {
    // 移除可能已存在的旧草稿，保证同时只有一个草稿
    configs.value = configs.value.filter((c) => c.id !== DRAFT_CONFIG_ID)
    const draft = buildDraftConfig(configs.value.length)
    configs.value.push(draft)
    activeConfigId.value = DRAFT_CONFIG_ID
    return draft
  }

  /**
   * 保存配置（草稿走新增，已存在走更新），成功后刷新列表并选中
   * @param id 配置 ID（DRAFT_CONFIG_ID 表示草稿）
   * @param patch 表单字段（apiKey 为空表示不修改；新增时为空表示暂不设密钥）
   */
  const saveConfig = async (id: number, patch: Partial<ModelProviderConfig> & { apiKey?: string }) => {
    if (id === DRAFT_CONFIG_ID) {
      const created = await addProvider({
        name: patch.name || '新配置',
        provider: patch.provider || 'openai',
        apiEndpoint: patch.apiEndpoint || '',
        apiKey: patch.apiKey,
        protocolType: patch.protocolType || 'openai-compatible',
        apiVersion: patch.apiVersion,
        remark: patch.remark,
        enabled: patch.enabled ?? true,
        sort: patch.sort
      })
      await loadAll()
      activeConfigId.value = created.data?.id ?? activeConfigId.value
    } else {
      await updateProvider({ id, ...patch, apiKey: patch.apiKey })
      await loadAll()
      activeConfigId.value = id
    }
  }

  /** 删除配置（草稿仅本地移除；已落库调后端） */
  const removeConfig = async (id: number) => {
    if (id === DRAFT_CONFIG_ID) {
      configs.value = configs.value.filter((c) => c.id !== DRAFT_CONFIG_ID)
      activeConfigId.value = configs.value[0]?.id ?? null
      return
    }
    await deleteProvider(id)
    if (currentSelection.value?.providerConfigId === id) {
      currentSelection.value = null
      saveCurrentSelection(null)
      persistSelectionToBackend(null)
    }
    await loadAll()
  }

  /** 启用/禁用配置 */
  const setConfigEnabled = async (id: number, enabled: boolean) => {
    if (id === DRAFT_CONFIG_ID) return
    await updateProvider({ id, enabled })
    await loadAll()
  }

  /** 在指定配置下新增模型；modelId 重复后端返回失败（抛错） */
  const addModel = async (configId: number, model: Partial<ModelConfig>): Promise<void> => {
    await apiAddModel({
      providerConfigId: configId,
      name: model.name || '新模型',
      modelId: model.modelId || '',
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens,
      poolGroup: model.poolGroup,
      defaultTemperature: model.defaultTemperature,
      defaultTopP: model.defaultTopP,
      timeoutSec: model.timeoutSec,
      retryCount: model.retryCount,
      supportText: model.supportText,
      supportImageInput: model.supportImageInput,
      supportImageOutput: model.supportImageOutput,
      supportTools: model.supportTools,
      supportStream: model.supportStream,
      supportCode: model.supportCode,
      supportLongText: model.supportLongText,
      enabled: model.enabled ?? true,
      sort: model.sort
    })
    await loadAll()
  }

  /** 更新模型 */
  const updateModel = async (modelId: number, patch: Partial<ModelConfig>): Promise<void> => {
    await apiUpdateModel({
      id: modelId,
      name: patch.name,
      modelId: patch.modelId,
      contextWindow: patch.contextWindow,
      maxOutputTokens: patch.maxOutputTokens,
      poolGroup: patch.poolGroup,
      defaultTemperature: patch.defaultTemperature,
      defaultTopP: patch.defaultTopP,
      timeoutSec: patch.timeoutSec,
      retryCount: patch.retryCount,
      supportText: patch.supportText,
      supportImageInput: patch.supportImageInput,
      supportImageOutput: patch.supportImageOutput,
      supportTools: patch.supportTools,
      supportStream: patch.supportStream,
      supportCode: patch.supportCode,
      supportLongText: patch.supportLongText,
      enabled: patch.enabled,
      sort: patch.sort
    })
    await loadAll()
  }

  /**
   * 新增模型并为其建立独立供应商连接（两层结构下"一模型一连接"）。
   * 由 API 地址推断供应商/协议，先建供应商再挂模型，成功后刷新并选中该配置。
   * @param model 模型字段
   * @param connection 连接信息（apiEndpoint 必填，apiKey 可空）
   * @returns 新建模型所属的供应商配置 ID
   */
  const createModelWithConnection = async (
    model: Partial<ModelConfig>,
    connection: { apiEndpoint: string; apiKey?: string }
  ): Promise<number> => {
    const { provider, protocolType } = inferProviderFromEndpoint(connection.apiEndpoint)
    const created = await addProvider({
      name: model.name || '新模型',
      provider,
      apiEndpoint: connection.apiEndpoint,
      apiKey: connection.apiKey,
      protocolType,
      enabled: true,
      sort: configs.value.length
    })
    const providerId = created.data?.id
    if (!providerId) throw new Error('创建供应商连接失败')
    await apiAddModel({
      providerConfigId: providerId,
      name: model.name || '新模型',
      modelId: model.modelId || '',
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens,
      poolGroup: model.poolGroup,
      defaultTemperature: model.defaultTemperature,
      defaultTopP: model.defaultTopP,
      timeoutSec: model.timeoutSec,
      retryCount: model.retryCount,
      supportText: model.supportText,
      supportImageInput: model.supportImageInput,
      supportImageOutput: model.supportImageOutput,
      supportTools: model.supportTools,
      supportStream: model.supportStream,
      supportCode: model.supportCode,
      supportLongText: model.supportLongText,
      enabled: model.enabled ?? true,
      sort: model.sort
    })
    await loadAll()
    activeConfigId.value = providerId
    return providerId
  }

  /**
   * 更新模型，并按需同步其所属供应商的连接信息（API 地址/密钥）。
   * 仅传入的连接字段会更新；apiKey 为空表示不改现有密钥。合并为一次刷新。
   * @param modelId 模型主键
   * @param providerId 所属供应商配置 ID
   * @param patch 模型字段
   * @param connection 连接信息（可选，apiKey 空则不改密钥）
   */
  const updateModelWithConnection = async (
    modelId: number,
    providerId: number,
    patch: Partial<ModelConfig>,
    connection?: { apiEndpoint?: string; apiKey?: string }
  ): Promise<void> => {
    await apiUpdateModel({
      id: modelId,
      name: patch.name,
      modelId: patch.modelId,
      contextWindow: patch.contextWindow,
      maxOutputTokens: patch.maxOutputTokens,
      poolGroup: patch.poolGroup,
      defaultTemperature: patch.defaultTemperature,
      defaultTopP: patch.defaultTopP,
      timeoutSec: patch.timeoutSec,
      retryCount: patch.retryCount,
      supportText: patch.supportText,
      supportImageInput: patch.supportImageInput,
      supportImageOutput: patch.supportImageOutput,
      supportTools: patch.supportTools,
      supportStream: patch.supportStream,
      supportCode: patch.supportCode,
      supportLongText: patch.supportLongText,
      enabled: patch.enabled,
      sort: patch.sort
    })
    // 连接字段有变更才更新供应商（apiKey 为空表示不改密钥）
    const key = connection?.apiKey?.trim()
    const endpoint = connection?.apiEndpoint?.trim()
    if (endpoint || key) {
      await updateProvider({
        id: providerId,
        ...(endpoint ? { apiEndpoint: endpoint } : {}),
        ...(key ? { apiKey: key } : {})
      })
    }
    await loadAll()
  }

  /** 删除模型；若为当前选择则重置 */
  const removeModel = async (modelId: number): Promise<void> => {
    await apiDeleteModel(modelId)
    if (currentSelection.value?.modelId === modelId) {
      currentSelection.value = null
      saveCurrentSelection(null)
      persistSelectionToBackend(null)
    }
    await loadAll()
  }

  /** 启用/禁用模型 */
  const setModelEnabled = async (modelId: number, enabled: boolean): Promise<void> => {
    await apiUpdateModel({ id: modelId, enabled })
    await loadAll()
  }

  /** 选择当前聊天模型并持久化（本机缓存 + 后端跨设备） */
  const selectModel = (providerConfigId: number, modelId: number) => {
    currentSelection.value = { providerConfigId, modelId }
    saveCurrentSelection(currentSelection.value)
    persistSelectionToBackend(currentSelection.value)
  }

  /** 校正当前选择：失效则回退首个可用模型，无则清空 */
  const ensureValidSelection = () => {
    const valid =
      currentSelection.value &&
      availableModels.value.some(
        (a) =>
          a.providerConfigId === currentSelection.value!.providerConfigId &&
          a.model.id === currentSelection.value!.modelId
      )
    if (valid) return
    const first = availableModels.value[0]
    currentSelection.value = first
      ? { providerConfigId: first.providerConfigId, modelId: first.model.id }
      : null
    saveCurrentSelection(currentSelection.value)
  }

  /**
   * 组装聊天请求参数（不含 apiKey/endpoint，后端按 ID 解密取用）
   * @returns 请求参数；无有效选择返回 null
   */
  const buildChatParams = (
    extra?: Partial<Pick<ChatRequestParams, 'stream' | 'temperature' | 'maxTokens'>>
  ): ChatRequestParams | null => {
    const sel = currentModel.value
    if (!sel) return null
    const cfg = configs.value.find((c) => c.id === sel.providerConfigId)
    if (!cfg) return null
    return {
      providerConfigId: cfg.id,
      modelId: sel.model.modelId,
      protocolType: cfg.protocolType,
      stream: extra?.stream ?? sel.model.supportStream,
      messages: [],
      temperature: extra?.temperature,
      maxTokens: extra?.maxTokens ?? sel.model.maxOutputTokens
    }
  }

  /**
   * 组装当前选中模型的运行时参数（随 forwardedProps 透传给后端应用）。
   * 温度/TopP/超时/重试改为每模型配置，从当前选中模型读取；缺省字段不下发，走后端默认。
   * @returns 运行时参数子集（可能为空对象）
   */
  const buildModelRuntimeParams = (): Record<string, unknown> => {
    const sel = currentModel.value
    if (!sel) return {}
    const m = sel.model
    const out: Record<string, unknown> = {}
    if (typeof m.defaultTemperature === 'number') out.temperature = m.defaultTemperature
    if (typeof m.defaultTopP === 'number') out.topP = m.defaultTopP
    if (typeof m.maxOutputTokens === 'number') out.maxTokens = m.maxOutputTokens
    if (typeof m.timeoutSec === 'number') out.timeoutSec = m.timeoutSec
    if (typeof m.retryCount === 'number') out.retryCount = m.retryCount
    return out
  }

  return {
    configs,
    activeConfigId,
    currentSelection,
    activeConfig,
    availableModels,
    availableModelGroups,
    hasAvailableModel,
    currentModel,
    init,
    loadAll,
    setActiveConfig,
    addConfig,
    saveConfig,
    removeConfig,
    setConfigEnabled,
    addModel,
    updateModel,
    createModelWithConnection,
    updateModelWithConnection,
    removeModel,
    setModelEnabled,
    selectModel,
    ensureValidSelection,
    buildChatParams,
    buildModelRuntimeParams
  }
})

