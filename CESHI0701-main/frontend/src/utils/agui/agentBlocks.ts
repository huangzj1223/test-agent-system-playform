/**
 * agent-blocks 协议解析器
 *
 * 智能体在流式文本中通过围栏携带结构化数据：
 *   ```agent-blocks
 *   { "blocks": [ { "type": "table", ... }, { "type": "chart", ... } ] }
 *   ```
 * 本模块从文本中提取该围栏 → 校验 → 产出结构化 MessageBlock[]，
 * 并返回去除围栏后的纯 Markdown 文本。图表数据严格来自此结构化协议，
 * 不从自然语言二次解析。所有字段做防御性校验，非法块降级为 error 块。
 */
import type {
  MessageBlock,
  TableBlock,
  ChartBlock,
  AgentChartType,
  AgentTableColumn,
  AgentDataRow
} from '@/types/agent-message'

/** 协议围栏正则：匹配完整的 ```agent-blocks ... ``` */
const BLOCK_FENCE_RE = /```agent-blocks\s*\n([\s\S]*?)\n```/g
/** 未闭合围栏探测：有起始无结束（流式中） */
const BLOCK_FENCE_OPEN_RE = /```agent-blocks\s*\n(?![\s\S]*```)/

/** 合法图表类型集合 */
const CHART_TYPES: AgentChartType[] = ['pie', 'bar', 'line']

/**
 * 注入给模型的 system 提示：约定数据类问题用 agent-blocks 协议输出结构化数据。
 * 让真实模型（如 DeepSeek）在需要展示表格/图表时，除文字说明外，
 * 额外输出一段 ```agent-blocks``` 围栏，前端据此渲染真实表格与 ECharts 图表。
 */
export const AGENT_BLOCKS_SYSTEM_PROMPT = `你是一个数据分析助手。当用户的问题涉及"统计、查询数量、分布、占比、趋势、画图/图表"等需要结构化展示的场景时，除了用中文简要说明结论，还必须在回答末尾输出一段结构化数据围栏，格式严格如下（不要输出多余解释、不要用其它语言、不要输出 ECharts 代码或 HTML）：

\`\`\`agent-blocks
{
  "blocks": [
    {
      "type": "table",
      "title": "标题",
      "columns": [
        { "key": "字段名", "title": "显示名", "dataType": "string" },
        { "key": "数值字段", "title": "显示名", "dataType": "number" }
      ],
      "rows": [ { "字段名": "值", "数值字段": 数字 } ]
    },
    {
      "type": "chart",
      "id": "唯一ID",
      "title": "图表标题",
      "supportedTypes": ["pie", "bar", "line"],
      "defaultType": "pie",
      "categoryField": "分类字段名",
      "valueFields": ["数值字段名"],
      "data": [ { "分类字段名": "值", "数值字段名": 数字 } ],
      "unit": "单位"
    }
  ]
}
\`\`\`

规则：
1. 分布/占比类（部门人数、角色占比）defaultType 用 "pie"；
2. 时间趋势类（按月份/日期统计）defaultType 用 "line"，categoryField 用时间字段；
3. 一般对比类用 "bar"；
4. table 与 chart 的 data 必须一致，字段名与 columns/valueFields 严格对应；
5. 数值字段必须是数字类型，不加引号；
6. 若无结构化数据需求（如闲聊），不要输出 agent-blocks 围栏。`

/** 解析结果 */
export interface ParsedAgentContent {
  /** 去除协议围栏后的纯 Markdown 文本 */
  displayText: string
  /** 解析出的结构化块 */
  blocks: MessageBlock[]
  /** 是否存在未闭合围栏（流式未完成） */
  pending: boolean
}

/** 安全取字符串 */
function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** 校验并规范化表格块；非法返回 null */
function normalizeTable(raw: Record<string, unknown>): TableBlock | null {
  const columns = Array.isArray(raw.columns) ? raw.columns : []
  const rows = Array.isArray(raw.rows) ? raw.rows : []
  const cols: AgentTableColumn[] = columns
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map(
      (c): AgentTableColumn => ({
        key: asString(c.key),
        title: asString(c.title) || asString(c.key),
        dataType:
          c.dataType === 'number' || c.dataType === 'date' ? c.dataType : 'string'
      })
    )
    .filter((c) => c.key)
  if (!cols.length) return null
  return {
    type: 'table',
    title: asString(raw.title) || undefined,
    columns: cols,
    rows: rows.filter((r): r is AgentDataRow => !!r && typeof r === 'object')
  }
}

/** 校验并规范化图表块；字段缺失/非法返回 null（由上层降级为 error 块） */
function normalizeChart(raw: Record<string, unknown>): ChartBlock | null {
  const categoryField = asString(raw.categoryField)
  const valueFields = Array.isArray(raw.valueFields)
    ? raw.valueFields.map(asString).filter(Boolean)
    : []
  const data = Array.isArray(raw.data)
    ? raw.data.filter((r): r is AgentDataRow => !!r && typeof r === 'object')
    : []
  // 关键字段缺失即判定非法
  if (!categoryField || !valueFields.length || !data.length) return null

  const supported = Array.isArray(raw.supportedTypes)
    ? (raw.supportedTypes.filter((t) => CHART_TYPES.includes(t as AgentChartType)) as AgentChartType[])
    : []
  const finalSupported = supported.length ? supported : (['bar'] as AgentChartType[])
  const defaultType = CHART_TYPES.includes(raw.defaultType as AgentChartType)
    ? (raw.defaultType as AgentChartType)
    : finalSupported[0]

  return {
    type: 'chart',
    id: asString(raw.id) || `chart-${Math.random().toString(36).slice(2, 8)}`,
    title: asString(raw.title) || '数据图表',
    description: asString(raw.description) || undefined,
    supportedTypes: finalSupported,
    defaultType: finalSupported.includes(defaultType) ? defaultType : finalSupported[0],
    categoryField,
    valueFields,
    data,
    unit: asString(raw.unit) || undefined
  }
}

// PART_2

/** 规范化单个原始块；未知/非法类型降级为 error 块 */
function normalizeBlock(raw: unknown): MessageBlock {
  if (!raw || typeof raw !== 'object') {
    return { type: 'error', message: '存在无法识别的数据块' }
  }
  const obj = raw as Record<string, unknown>
  switch (obj.type) {
    case 'markdown':
      return { type: 'markdown', content: asString(obj.content) }
    case 'code':
      return { type: 'code', lang: asString(obj.lang) || undefined, content: asString(obj.content) }
    case 'error':
      return { type: 'error', message: asString(obj.message) || '数据加载失败' }
    case 'table': {
      const t = normalizeTable(obj)
      return t ?? { type: 'error', message: '表格数据不完整，无法展示' }
    }
    case 'chart': {
      const c = normalizeChart(obj)
      return c ?? { type: 'error', message: '当前结果不适合生成图表，或图表字段配置不完整' }
    }
    default:
      return { type: 'error', message: '存在无法识别的数据块' }
  }
}

/**
 * 从消息文本中解析 agent-blocks 协议。
 * @param content 消息原始文本（可能含 ```agent-blocks``` 围栏）
 * @returns 纯 Markdown 文本 + 结构化块 + 是否存在未闭合围栏
 */
export function parseAgentBlocks(content: string): ParsedAgentContent {
  if (!content) return { displayText: '', blocks: [], pending: false }

  const blocks: MessageBlock[] = []
  // 提取所有完整围栏
  let displayText = content.replace(BLOCK_FENCE_RE, (_m, json: string) => {
    try {
      const parsed = JSON.parse(json) as { blocks?: unknown }
      const list = Array.isArray(parsed?.blocks) ? parsed.blocks : []
      for (const b of list) blocks.push(normalizeBlock(b))
    } catch {
      blocks.push({ type: 'error', message: '结构化数据解析失败' })
    }
    return '' // 从展示文本中移除协议原文
  })

  // 检测未闭合围栏（流式中，尚未收到结束 ```）
  const pending = BLOCK_FENCE_OPEN_RE.test(displayText)
  if (pending) {
    // 隐藏未闭合围栏起始行及其后内容，避免展示协议半成品
    displayText = displayText.replace(/```agent-blocks[\s\S]*$/, '')
  }

  return { displayText: displayText.trim(), blocks, pending }
}

