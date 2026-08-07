/**
 * 运行日志固定枚举（方案C混合）
 *
 * 日志类型/状态采用固定枚举，作为后端白名单校验依据，与前端 runLogTypes.ts 保持一致。
 * 风险等级 L1-L4 与安全策略/技能/记忆统一。
 */

/** 全部日志类型（6 类，供查询过滤白名单） */
export const RUN_LOG_TYPES = [
  'conversation',
  'skill',
  'tool',
  'error',
  'memory',
  'system',
] as const;

export type RunLogType = (typeof RUN_LOG_TYPES)[number];

/**
 * 本表可写入的类型（仅无独立源表的三类）。
 * skill/tool/memory 由各自明细表承载，不写本表，查询时聚合。
 */
export const RUN_LOG_OWN_TYPES = ['conversation', 'system', 'error'] as const;

export type RunLogOwnType = (typeof RUN_LOG_OWN_TYPES)[number];

/** 执行状态 */
export const RUN_LOG_STATUS = ['success', 'failed', 'running', 'cancelled', 'blocked'] as const;

export type RunLogStatus = (typeof RUN_LOG_STATUS)[number];

/** 判断日志类型是否合法（含 6 类） */
export function isValidRunLogType(v: string): v is RunLogType {
  return (RUN_LOG_TYPES as readonly string[]).includes(v);
}

/** 判断是否为本表可写类型（conversation/system/error） */
export function isOwnRunLogType(v: string): v is RunLogOwnType {
  return (RUN_LOG_OWN_TYPES as readonly string[]).includes(v);
}

/** 判断状态是否合法 */
export function isValidRunLogStatus(v: string): v is RunLogStatus {
  return (RUN_LOG_STATUS as readonly string[]).includes(v);
}

/** 来源前缀：统一日志 id 加前缀区分数据来源，便于 detail 路由回查 */
export const RUN_LOG_ID_PREFIX = {
  own: 'run-',
  skill: 'skill-',
  tool: 'tool-',
  memory: 'mem-',
} as const;
