/**
 * 模型配置 API
 * 对接后端 /admin/model-config：供应商配置与模型的增删改查、连接测试。
 * apiKey 仅在新增/更新时明文上送（加密存库），列表/详情不回显（仅 hasApiKey）。
 */
import request from '@/utils/http'
import type { ModelProviderConfig, ModelConfig } from '@/types/model'

/** 供应商配置列表项（后端脱敏，不含 models 与密钥） */
export type ProviderConfigVo = Omit<ModelProviderConfig, 'models'>

/** 新增供应商配置入参 */
export interface AddProviderPayload {
  name: string
  provider: string
  apiEndpoint: string
  apiKey?: string
  protocolType: string
  apiVersion?: string
  remark?: string
  enabled?: boolean
  sort?: number
}

/** 更新供应商配置入参（id 必填；apiKey 空表示不改） */
export interface UpdateProviderPayload extends Partial<AddProviderPayload> {
  id: number
}

/** 新增模型入参 */
export interface AddModelPayload {
  providerConfigId: number
  name: string
  modelId: string
  contextWindow?: number
  maxOutputTokens?: number
  poolGroup?: string
  defaultTemperature?: number
  defaultTopP?: number
  timeoutSec?: number
  retryCount?: number
  supportText?: boolean
  supportImageInput?: boolean
  supportImageOutput?: boolean
  supportTools?: boolean
  supportStream?: boolean
  supportCode?: boolean
  supportLongText?: boolean
  enabled?: boolean
  sort?: number
}

/** 更新模型入参（id 必填） */
export interface UpdateModelPayload extends Partial<Omit<AddModelPayload, 'providerConfigId'>> {
  id: number
}

/** 供应商配置列表（脱敏，分页结构取 list） */
export function fetchProviderList() {
  return request.get<{ list: ProviderConfigVo[] }>({
    url: '/admin/model-config/provider/list',
    params: { pageSize: 100 }
  })
}

/** 某供应商下的模型列表 */
export function fetchModelList(providerConfigId: number) {
  return request.get<{ list: ModelConfig[] }>({
    url: '/admin/model-config/model/list',
    params: { providerConfigId, pageSize: 100 }
  })
}

/**
 * 一次性拉取全部供应商配置及其模型（脱敏），供聊天面板首屏加载。
 * 单请求取全量，替代「provider/list + 逐个 model/list」的 N+1 串行往返。
 */
export function fetchAllWithModels() {
  return request.get<{ list: ModelProviderConfig[] }>({
    url: '/admin/model-config/provider/all-with-models'
  })
}

/** 新增供应商配置 */
export function addProvider(data: AddProviderPayload) {
  return request.post<ProviderConfigVo>({ url: '/admin/model-config/provider/add', data })
}

/** 更新供应商配置 */
export function updateProvider(data: UpdateProviderPayload) {
  return request.put({ url: '/admin/model-config/provider/update', data })
}

/** 删除供应商配置 */
export function deleteProvider(id: number) {
  return request.del({ url: `/admin/model-config/provider/delete/${id}` })
}

/** 测试供应商连接（用已存密钥探测，不回显密钥） */
export function testProviderConnection(id: number, modelId?: string) {
  return request.post<{ reachable: boolean }>({
    url: '/admin/model-config/provider/test-connection',
    data: { id, modelId }
  })
}

/**
 * 揭示已存 API Key 明文（用户点击「查看」时按需调用，需 reveal-key 权限）
 * 安全提示：返回明文仅用于当前查看，前端不缓存、不落任何持久化存储。
 * @param id 供应商配置 ID
 */
export function revealProviderKey(id: number) {
  return request.get<{ apiKey: string }>({
    url: `/admin/model-config/provider/reveal-key/${id}`
  })
}

/** 新增模型 */
export function addModel(data: AddModelPayload) {
  return request.post<ModelConfig>({ url: '/admin/model-config/model/add', data })
}

/** 更新模型 */
export function updateModel(data: UpdateModelPayload) {
  return request.put({ url: '/admin/model-config/model/update', data })
}

/** 删除模型 */
export function deleteModel(id: number) {
  return request.del({ url: `/admin/model-config/model/delete/${id}` })
}
