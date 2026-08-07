/**
 * 模型「当前选择」的本机持久化
 *
 * 供应商配置与模型均已落后端数据库，本机仅保存「当前聊天选用哪个模型」这一非敏感偏好，
 * 便于用户下次进入沿用上次选择。绝不在此存储 apiKey 等敏感信息。
 */
import type { CurrentModelSelection, ModelProviderConfig } from '@/types/model'

/** 当前选择模型存储键 */
const KEY_CURRENT = 'ai_current_model'

/** 模型配置列表缓存键（供首屏 stale-while-revalidate 回填） */
const KEY_CONFIGS_CACHE = 'ai_model_configs_cache'

/**
 * 读取当前选择的模型
 * @returns 当前选择（无或解析失败返回 null）
 */
export function loadCurrentSelection(): CurrentModelSelection | null {
  const raw = localStorage.getItem(KEY_CURRENT)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CurrentModelSelection
    // 校验为数字 ID（旧版本可能存过字符串 ID，非法则视为无选择）
    if (typeof parsed?.providerConfigId === 'number' && typeof parsed?.modelId === 'number') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * 保存当前选择的模型
 * @param selection 当前选择，传 null 表示清除
 */
export function saveCurrentSelection(selection: CurrentModelSelection | null): void {
  if (selection) {
    localStorage.setItem(KEY_CURRENT, JSON.stringify(selection))
  } else {
    localStorage.removeItem(KEY_CURRENT)
  }
}

/**
 * 读取缓存的供应商配置列表（首屏快速回填用）。
 * 后端返回本就脱敏（无 apiKey），此处仅作首屏加速缓存；命中后仍会后台刷新覆盖为最新。
 * @returns 配置数组；无缓存或结构非法返回 null
 */
export function loadCachedConfigs(): ModelProviderConfig[] | null {
  const raw = localStorage.getItem(KEY_CONFIGS_CACHE)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    // 基本结构校验：数组，且每项含数字 id 与 models 数组，非法即视为无缓存
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (c) => c && typeof c.id === 'number' && Array.isArray((c as ModelProviderConfig).models)
      )
    ) {
      return parsed as ModelProviderConfig[]
    }
    return null
  } catch {
    return null
  }
}

/**
 * 写入供应商配置列表缓存。
 * 仅缓存非敏感展示数据（后端已脱敏）；传空数组也照常写入以反映"已清空"状态。
 * @param configs 供应商配置数组
 */
export function saveCachedConfigs(configs: ModelProviderConfig[]): void {
  try {
    localStorage.setItem(KEY_CONFIGS_CACHE, JSON.stringify(configs))
  } catch {
    // 存储配额满等异常忽略：缓存仅为加速，失败不影响后端正常加载
  }
}
