/**
 * 工具权限固定枚举
 *
 * 工具类型与风险等级采用固定枚举（非字典表），作为后端白名单校验依据，
 * 与前端 tool-permission/types.ts 保持一致。风险等级 L1-L4 与安全策略统一。
 */

/** 工具类型 */
export const TOOL_TYPES = ['cli', 'api', 'database', 'filesystem', 'page', 'browser', 'external'] as const;
export type ToolType = (typeof TOOL_TYPES)[number];

/** 工具类型显示名（管理 UI 用） */
export const TOOL_TYPE_LABELS: Record<string, string> = {
  cli: 'CLI 工具',
  api: 'API 接口',
  database: '数据库',
  filesystem: '文件系统',
  page: '页面操作',
  browser: '浏览器控制',
  external: '外部服务',
};

/** 风险等级（L1-L4，与安全策略统一） */
export const TOOL_RISK_LEVELS = ['L1', 'L2', 'L3', 'L4'] as const;
export type ToolRiskLevel = (typeof TOOL_RISK_LEVELS)[number];

/** 高风险等级集合（统计"高风险工具"用） */
export const TOOL_HIGH_RISK_LEVELS: readonly string[] = ['L3', 'L4'];

/** 校验函数：工具类型 */
export function isValidToolType(v: string): v is ToolType {
  return (TOOL_TYPES as readonly string[]).includes(v);
}

/** 校验函数：风险等级 */
export function isValidToolRiskLevel(v: string): v is ToolRiskLevel {
  return (TOOL_RISK_LEVELS as readonly string[]).includes(v);
}
