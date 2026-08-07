/**
 * 接口类型：1-API推送，2-API拉取
 */
export type InterfaceType = 1 | 2

/**
 * 认证方式：1-无认证，2-Token认证
 */
export type AuthType = 1 | 2

/**
 * 同步频率：1-实时，2-1小时，3-1天
 */
export type SyncFrequency = 1 | 2 | 3

/**
 * 第三方接口配置
 */
export interface ApiConfig {
  id: number
  name: string
  systemName: string
  interfaceType: InterfaceType
  apiUrl: string
  authType: AuthType
  authToken?: string
  syncFrequency: SyncFrequency
  status: 0 | 1
  lastSyncTime?: string
  successCount: number
  failCount: number
  lastError?: string
  description?: string
  createTime: string
  updateTime: string
}

/**
 * 查询参数
 */
export interface ApiConfigQueryParams {
  name?: string
  status?: number | string | null
  page: number
  pageSize: number
}

/**
 * 新增/编辑表单
 */
export interface ApiConfigForm {
  id?: number
  name: string
  systemName: string
  interfaceType: InterfaceType
  apiUrl: string
  authType: AuthType
  authToken: string
  syncFrequency: SyncFrequency
  status: 0 | 1
  description: string
}
