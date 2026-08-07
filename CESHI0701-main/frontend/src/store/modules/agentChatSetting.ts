/**
 * 智能体聊天设置 Store
 * 对话参数 / 界面偏好 / 快捷提示词模板落后端数据库（按用户隔离），本 store 负责拉取、缓存与保存。
 * 面板挂载时拉取；渲染组件消费 uiPrefs；发送消息时 buildChatParams 组装对话参数随请求透传。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchChatSetting,
  saveChatSetting,
  fetchAgentConfig,
  type ChatSetting,
  type ChatParams,
  type UiPrefs,
  type PromptTemplate,
  type SaveChatSettingPayload,
  type AgentLimits
} from '@/api/agentSetting'

/**
 * 前端兜底默认值：仅在后端配置尚未拉取或拉取失败时临时使用，
 * 拉到 /admin/ag-ui/config 后即被后端配置覆盖。不是权威值，故标注为 fallback。
 */
const FALLBACK_UI_PREFS: UiPrefs = {
  fontSize: 'medium',
  density: 'comfortable',
  showReasoning: true,
  showToolCalls: true
}

/** 前端兜底限制值（同上，拉到配置后被覆盖） */
const FALLBACK_LIMITS: AgentLimits = {
  maxTokensCeiling: 128000,
  systemPromptMaxLen: 4000,
  templateMaxCount: 50,
  templateContentMaxLen: 2000,
  templateTitleMaxLen: 50,
  runTimeoutMs: 120000
}

export const useAgentChatSettingStore = defineStore('agentChatSettingStore', () => {
  /** 对话参数 */
  const chatParams = ref<ChatParams>({ systemPrompt: '' })
  /** 界面偏好 */
  const uiPrefs = ref<UiPrefs>({ ...FALLBACK_UI_PREFS })
  /** 快捷提示词模板 */
  const promptTemplates = ref<PromptTemplate[]>([])
  /** 业务限制值（后端全局配置下发，驱动 UI 限制；拉取前用兜底值） */
  const limits = ref<AgentLimits>({ ...FALLBACK_LIMITS })
  /** 是否已初始化（避免重复拉取） */
  const initialized = ref(false)
  /** 保存请求单调序号：仅允许最新一次保存的响应回写，丢弃迟到的旧响应，防止并发乱序覆盖 */
  let saveSeq = 0

  /** 用后端返回的完整设置刷新本地状态 */
  const applySetting = (s: ChatSetting) => {
    chatParams.value = s.chatParams
    uiPrefs.value = s.uiPrefs
    promptTemplates.value = s.promptTemplates
  }

  /** 初始化：并行拉取全局配置与用户设置（失败保留兜底值，不阻断面板） */
  const init = async (): Promise<void> => {
    if (initialized.value) return
    // 全局配置与用户设置互不依赖，并行拉取
    const [cfgRes, settingRes] = await Promise.allSettled([fetchAgentConfig(), fetchChatSetting()])
    if (cfgRes.status === 'fulfilled' && cfgRes.value.data) {
      limits.value = cfgRes.value.data.limits
      // 用户设置里没有的界面偏好项，回退到后端配置的默认值
      uiPrefs.value = { ...cfgRes.value.data.defaultUiPrefs }
    }
    if (settingRes.status === 'fulfilled' && settingRes.value.data) {
      applySetting(settingRes.value.data)
    }
    // 只要有一项成功即视为已初始化；全失败则保留兜底值，下次进面板重试
    if (cfgRes.status === 'fulfilled' || settingRes.status === 'fulfilled') {
      initialized.value = true
    }
  }

  /**
   * 保存设置（局部提交，后端与现有设置合并），成功后用返回值刷新本地
   * @param payload 待保存的部分设置
   */
  const save = async (payload: SaveChatSettingPayload): Promise<void> => {
    const seq = ++saveSeq
    const res = await saveChatSetting(payload)
    // 仅当本次是最新一次保存时才回写，丢弃迟到的旧响应（界面偏好可能快速连续保存）
    if (seq === saveSeq && res.data) applySetting(res.data)
  }

  /**
   * 组装随聊天请求透传的对话参数（供 forwardedProps 使用）。
   * 仅返回已设置的字段，缺省交给模型默认；systemPrompt 去空白后为空则不带。
   * @returns 对话参数子集（可能为空对象）
   */
  const buildChatParams = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    // 温度/最大输出已改为每模型配置（由 modelConfig store 出），此处仅出全局系统提示词
    const sp = chatParams.value.systemPrompt?.trim()
    if (sp) out.systemPrompt = sp
    return out
  }

  return {
    chatParams,
    uiPrefs,
    promptTemplates,
    limits,
    initialized,
    init,
    save,
    buildChatParams
  }
})
