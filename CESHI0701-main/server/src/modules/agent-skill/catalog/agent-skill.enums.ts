/**
 * 智能体技能固定枚举
 *
 * 类型/分类与风险等级采用固定枚举（非字典表），作为后端白名单校验依据，
 * 与前端 Skills 管理台的分类侧栏、筛选器保持一致。新增分类需改此处（需评审）。
 */

/** 技能类型/分类 */
export const SKILL_CATEGORY_VALUES = [
  'query', // 查询类
  'generate', // 生成类
  'operation', // 操作类
  'cli', // CLI 操作类
  'decision', // 预测/决策类
  'workflow', // 工作流编排
] as const;

export type SkillCategory = (typeof SKILL_CATEGORY_VALUES)[number];

/** 分类显示名（管理 UI 用） */
export const SKILL_CATEGORY_LABELS: Record<string, string> = {
  query: '查询类',
  generate: '生成类',
  operation: '操作类',
  cli: 'CLI 操作类',
  decision: '预测/决策类',
  workflow: '工作流编排',
};

/** 风险等级（L1-L4，与安全策略/工具权限统一） */
export const SKILL_RISK_VALUES = ['L1', 'L2', 'L3', 'L4'] as const;

export type SkillRiskLevel = (typeof SKILL_RISK_VALUES)[number];

/** 高风险等级集合（统计"高风险"卡片用） */
export const HIGH_RISK_LEVELS: readonly string[] = ['L3', 'L4'];

/** 风险等级说明文案（与安全策略 L1-L4 语义一致；供管理 UI 权限控制页签展示，含 L4） */
export const SKILL_RISK_NOTES: Record<string, string> = {
  L1: '只读能力，不改动任何数据或文件，智能体可直接调用，无需确认。',
  L2: '低风险写入，仅影响非关键数据，默认放行但会记录调用。',
  L3: '写入/修改类操作，需人工确认后执行，并记入审计日志。',
  L4: '高风险执行（落盘/删除/危险命令等），默认拒绝，除非显式放行或通过审批，且强制审计。',
};

/**
 * 可选的"适用智能体"清单（供技能编辑时下拉选择，替代自由文本输入）。
 * 当前系统仅有一个真实智能体 "AG-UI 智能体"；未来接入多智能体时在此扩充。
 * 不编造不存在的智能体，避免技能配置引用无效目标。
 */
export const SKILL_APPLICABLE_AGENTS: readonly string[] = ['AG-UI 智能体'];

/** 判断分类 key 是否合法 */
export function isValidCategory(v: string): v is SkillCategory {
  return (SKILL_CATEGORY_VALUES as readonly string[]).includes(v);
}

/** 判断风险等级是否合法 */
export function isValidRiskLevel(v: string): v is SkillRiskLevel {
  return (SKILL_RISK_VALUES as readonly string[]).includes(v);
}
