/**
 * 智能体结构化消息块类型定义
 *
 * 智能体消息除纯文本外，可携带结构化块（表格 / 图表 / 代码 / 错误），
 * 由约定协议 ```agent-blocks {JSON} ``` 从流式文本中解析而来（见 utils/agentBlocks.ts）。
 * 前端图表严格基于结构化数据渲染，不从自然语言二次解析。
 */

/** 图表类型 */
export type AgentChartType = 'pie' | 'bar' | 'line'

/** 数据查看模式（表格 / 图表 / 两者） */
export type AgentViewMode = 'table' | 'chart' | 'both'

/** 列数据类型 */
export type AgentColumnDataType = 'string' | 'number' | 'date'

/** 表格列定义 */
export interface AgentTableColumn {
  /** 字段键（对应 row 的属性名） */
  key: string
  /** 列显示名 */
  title: string
  /** 数据类型（number 右对齐） */
  dataType?: AgentColumnDataType
}

/** 结构化数据行 */
export type AgentDataRow = Record<string, string | number | null>

/** Markdown 文本块 */
export interface MarkdownBlock {
  type: 'markdown'
  content: string
}

/** 表格块 */
export interface TableBlock {
  type: 'table'
  title?: string
  columns: AgentTableColumn[]
  rows: AgentDataRow[]
}

/** 图表块（一份 data 支持多种图表类型切换） */
export interface ChartBlock {
  type: 'chart'
  /** 图表块 ID（消息内唯一，用于保存切换状态） */
  id: string
  title: string
  description?: string
  /** 支持的图表类型 */
  supportedTypes: AgentChartType[]
  /** 默认图表类型 */
  defaultType: AgentChartType
  /** 分类字段（x 轴 / 饼图 name） */
  categoryField: string
  /** 数值字段（可多系列） */
  valueFields: string[]
  /** 数据行 */
  data: AgentDataRow[]
  /** 单位（可选，如「人」） */
  unit?: string
}

/** 代码块 */
export interface CodeBlock {
  type: 'code'
  /** 语言（用于高亮） */
  lang?: string
  content: string
}

/** 错误块 */
export interface ErrorBlock {
  type: 'error'
  message: string
}

/** 消息块联合类型 */
export type MessageBlock = MarkdownBlock | TableBlock | ChartBlock | CodeBlock | ErrorBlock

/** 单个图表的显示状态（按 messageId -> chartId 存储） */
export interface AgentChartViewState {
  /** 当前图表类型 */
  currentChartType: AgentChartType
  /** 当前查看模式 */
  currentViewMode: AgentViewMode
}
