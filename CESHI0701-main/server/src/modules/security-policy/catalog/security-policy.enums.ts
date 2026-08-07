/**
 * 安全策略固定枚举
 *
 * 风险等级、默认行为、审批方式、超时处理、敏感词处理方式、名单类型、工单状态、操作类型
 * 均采用固定枚举（非字典表），作为后端白名单校验依据，与前端 security-policy/types.ts 保持一致。
 * 风险等级 L1-L4 为跨模块单一事实来源（Skills / 工具权限 / 安全策略共用）。
 */

/** 风险等级（L1 只读 / L2 低风险写入 / L3 写入修改 / L4 高风险执行） */
export const RISK_LEVELS = ['L1', 'L2', 'L3', 'L4'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** 高风险等级集合（统计"高风险"用） */
export const HIGH_RISK_LEVELS: readonly string[] = ['L3', 'L4'];

/** 风险等级默认行为 */
export const DEFAULT_ACTIONS = ['allow', 'require_approval', 'deny'] as const;
export type DefaultAction = (typeof DEFAULT_ACTIONS)[number];

/** 审批方式 */
export const APPROVAL_MODES = ['none', 'confirm', 'manual', 'multi_person'] as const;
export type ApprovalMode = (typeof APPROVAL_MODES)[number];

/** 审批超时处理 */
export const TIMEOUT_ACTIONS = ['approve', 'deny', 'cancel', 'wait'] as const;
export type TimeoutAction = (typeof TIMEOUT_ACTIONS)[number];

/** 敏感词处理方式 */
export const SENSITIVE_ACTIONS = ['allow', 'mask', 'block', 'deny_memory', 'confirm', 'audit'] as const;
export type SensitiveAction = (typeof SENSITIVE_ACTIONS)[number];

/** 黑白名单类型 */
export const LIST_TYPES = ['command_white', 'command_black', 'dir_white', 'api_db_black'] as const;
export type ListType = (typeof LIST_TYPES)[number];

/** 审批工单状态 */
export const APPROVAL_STATUS = ['pending', 'approved', 'rejected', 'timeout', 'cancelled'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUS)[number];

/** 安全校验操作类型 */
export const ACTION_TYPES = ['cli', 'api', 'database', 'file', 'page', 'memory', 'skill'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** 聚合配置键 */
export const SECURITY_CONFIG_KEYS = {
  global: 'security.global',
  sandbox: 'security.sandbox',
  audit: 'security.audit',
} as const;

/** 校验函数：风险等级 */
export function isValidRiskLevel(v: string): v is RiskLevel {
  return (RISK_LEVELS as readonly string[]).includes(v);
}

/** 校验函数：默认行为 */
export function isValidDefaultAction(v: string): v is DefaultAction {
  return (DEFAULT_ACTIONS as readonly string[]).includes(v);
}

/** 校验函数：名单类型 */
export function isValidListType(v: string): v is ListType {
  return (LIST_TYPES as readonly string[]).includes(v);
}
