/**
 * 图表数据转换工具
 *
 * 将结构化 ChartBlock 的原始行数据转换为各图表类型所需的映射结构。
 * 负责：数值字段强制转数字、分类字段取值、日期字段排序、Top N 合并、空值处理。
 * 所有转换基于结构化数据，不涉及自然语言解析。
 */
import type { ChartBlock, AgentDataRow } from '@/types/agent-message'

/** 饼图数据项 */
export interface PieDatum {
  name: string
  value: number
}

/** 单元格转数字：非法/空值归 0（用于图表数值系列） */
export function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, '').trim())
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** 分类字段取字符串值，空值显示占位 */
export function categoryLabel(row: AgentDataRow, field: string): string {
  const v = row[field]
  if (v === null || v === undefined || v === '') return '未分类'
  return String(v)
}

/**
 * 按分类字段的日期语义排序（仅当 chart 是折线且分类像日期时）。
 * 无法解析为日期则保持原序。
 * @param rows 原始行
 * @param field 分类字段
 */
export function sortByDateIfPossible(rows: AgentDataRow[], field: string): AgentDataRow[] {
  const parseable = rows.every((r) => {
    const v = r[field]
    return v != null && !Number.isNaN(Date.parse(String(v)))
  })
  if (!parseable) return rows
  return [...rows].sort((a, b) => Date.parse(String(a[field])) - Date.parse(String(b[field])))
}

/**
 * 饼图数据映射：取第一个数值字段；数据项超过 Top N 时合并为「其他」。
 * @param block 图表块
 * @param topN 保留的最大分类数（默认 10）
 */
export function toPieData(block: ChartBlock, topN = 10): PieDatum[] {
  const field = block.valueFields[0]
  const all: PieDatum[] = block.data.map((row) => ({
    name: categoryLabel(row, block.categoryField),
    value: toNumber(row[field])
  }))
  if (all.length <= topN) return all
  // 降序取 Top N，其余合并
  const sorted = [...all].sort((a, b) => b.value - a.value)
  const top = sorted.slice(0, topN)
  const restValue = sorted.slice(topN).reduce((sum, d) => sum + d.value, 0)
  if (restValue > 0) top.push({ name: '其他', value: restValue })
  return top
}

/** 轴类图表（柱/折线）最大渲染行数，超出截断，防不可信大数据集卡死浏览器 */
export const AXIS_MAX_POINTS = 500

/** 轴类图表的分类轴标签（超上限截断） */
export function toCategories(block: ChartBlock, sortDate = false): string[] {
  const rows = sortDate ? sortByDateIfPossible(block.data, block.categoryField) : block.data
  return rows.slice(0, AXIS_MAX_POINTS).map((row) => categoryLabel(row, block.categoryField))
}

/**
 * 轴类图表的多系列数据：每个 valueField 一条系列（超上限截断）。
 * @param block 图表块
 * @param sortDate 是否按日期排序（折线图用）
 */
export function toSeriesData(
  block: ChartBlock,
  sortDate = false
): Array<{ name: string; values: number[] }> {
  const rows = (sortDate ? sortByDateIfPossible(block.data, block.categoryField) : block.data).slice(
    0,
    AXIS_MAX_POINTS
  )
  return block.valueFields.map((field) => ({
    name: field,
    values: rows.map((row) => toNumber(row[field]))
  }))
}

/** 轴类图表数据是否被截断（供 UI 提示） */
export function isAxisTruncated(block: ChartBlock): boolean {
  return block.data.length > AXIS_MAX_POINTS
}

/** 判断图表数据是否为空（无行 或 所有数值为 0） */
export function isChartDataEmpty(block: ChartBlock): boolean {
  if (!block.data.length) return true
  return block.data.every((row) => block.valueFields.every((f) => toNumber(row[f]) === 0))
}
