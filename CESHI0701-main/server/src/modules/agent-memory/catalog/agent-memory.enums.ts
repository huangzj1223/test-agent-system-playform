/**
 * 记忆中心固定枚举
 *
 * 分类/风险等级/变更类型/状态采用固定枚举（非字典表），作为后端白名单校验依据，
 * 与前端记忆中心的展示保持一致。风险等级与安全策略/技能 L1-L4 统一。
 */

/** 记忆分类（internal 内部记忆；预留 project 项目记忆 / custom 自定义） */
export const MEMORY_CATEGORY_VALUES = ['internal', 'project', 'custom'] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORY_VALUES)[number];

/** 分类显示名 */
export const MEMORY_CATEGORY_LABELS: Record<string, string> = {
  internal: '内部记忆',
  project: '项目记忆',
  custom: '自定义记忆',
};

/** 风险等级（L1-L4，与安全策略/技能统一） */
export const MEMORY_RISK_VALUES = ['L1', 'L2', 'L3', 'L4'] as const;

export type MemoryRiskLevel = (typeof MEMORY_RISK_VALUES)[number];

/** 高风险等级集合（统计"高风险记忆数"卡片用） */
export const HIGH_RISK_LEVELS: readonly string[] = ['L3', 'L4'];

/** 变更类型（版本快照的产生原因） */
export const MEMORY_CHANGE_TYPES = ['create', 'update', 'rollback', 'confirm', 'suggestion'] as const;

export type MemoryChangeType = (typeof MEMORY_CHANGE_TYPES)[number];

/** 待确认记忆状态 */
export const PENDING_STATUS_VALUES = ['pending', 'confirmed', 'ignored'] as const;

export type PendingStatus = (typeof PENDING_STATUS_VALUES)[number];

/** 模型建议状态 */
export const SUGGESTION_STATUS_VALUES = ['pending', 'applied', 'ignored'] as const;

export type SuggestionStatus = (typeof SUGGESTION_STATUS_VALUES)[number];

/** 判断分类 key 是否合法 */
export function isValidMemoryCategory(v: string): v is MemoryCategory {
  return (MEMORY_CATEGORY_VALUES as readonly string[]).includes(v);
}

/** 判断风险等级是否合法 */
export function isValidMemoryRiskLevel(v: string): v is MemoryRiskLevel {
  return (MEMORY_RISK_VALUES as readonly string[]).includes(v);
}

/**
 * 版本号自增修订号：vX.Y.Z → vX.Y.(Z+1)；无法解析时回落 v1.0.1。
 * 放在无依赖的 enums 文件，供 service 与 version service 共用，避免服务间循环 import。
 * @param current 当前版本字符串
 */
export function bumpVersion(current: string): string {
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(current || '');
  if (!m) return 'v1.0.1';
  return `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}
