/**
 * Skills 管理台共享常量：分类/风险等级显示映射与筛选选项。
 * 与后端固定枚举（agent-skill.enums.ts）保持一致。
 */
import type { SkillCategory, SkillRiskLevel } from '@/api/agentSkill'

/** 分类 key → 显示名 */
export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  query: '查询类',
  generate: '生成类',
  operation: '操作类',
  cli: 'CLI 操作类',
  decision: '预测/决策类',
  workflow: '工作流编排'
}

/** 分类筛选下拉选项 */
export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as SkillCategory[]).map((value) => ({
  value,
  label: CATEGORY_LABELS[value]
}))

/** 风险等级 → 显示配置（文案 + Element tag 类型） */
export const RISK_META: Record<SkillRiskLevel, { label: string; tagType: 'success' | 'warning' | 'danger' }> = {
  L1: { label: 'L1', tagType: 'success' },
  L2: { label: 'L2', tagType: 'warning' },
  L3: { label: 'L3', tagType: 'danger' },
  L4: { label: 'L4', tagType: 'danger' }
}

/** 风险等级筛选下拉选项 */
export const RISK_OPTIONS = (Object.keys(RISK_META) as SkillRiskLevel[]).map((value) => ({
  value,
  label: RISK_META[value].label
}))

/** 状态筛选下拉选项 */
export const STATUS_OPTIONS = [
  { value: 1, label: '启用' },
  { value: 0, label: '禁用' }
]

/**
 * 把毫秒时间戳/ISO 字符串格式化为"x分钟前 / x小时前 / x天前"，空值返回占位。
 * @param time ISO 字符串或时间戳
 */
export function formatRelativeTime(time?: string | null): string {
  if (!time) return '从未运行'
  const t = new Date(time).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  return `${day}天前`
}
