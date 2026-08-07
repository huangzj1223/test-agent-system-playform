/**
 * ECharts option 工厂
 *
 * 按当前图表类型（pie/bar/line）+ 结构化 ChartBlock 生成 ECharts option。
 * 三种图表共用同一份 data，仅按 chartType 重新生成 option（不重查数据）。
 * 主色取自项目主题色板（useChartOps），不在此写死品牌色。
 * 内置：饼图 Top N（数据转换层已合并）、轴类 dataZoom（大数据量）、标签旋转、数值格式化。
 */
import type { EChartsOption } from 'echarts'
import { useChartOps } from '@/composables/useChart'
import { escapeHtml } from '@/utils/markdown/renderMarkdown'
import type { ChartBlock, AgentChartType } from '@/types/agent-message'
import { toPieData, toCategories, toSeriesData } from './chart-data-transform'

/** 超过此行数启用 dataZoom（轴类）与标签精简 */
const LARGE_DATA_THRESHOLD = 100

/** 饼图 tooltip 回调参数（仅用到这几个字段） */
interface PieTooltipParam {
  name: string
  value: number
  percent: number
}

/** 千分位格式化大数值 */
function formatNumber(v: number): string {
  return v >= 1000 ? v.toLocaleString('zh-CN') : String(v)
}

/** 取主题色板（复用项目图表配色） */
function palette(): string[] {
  return useChartOps().colors
}

/** 生成饼图 option */
function pieOption(block: ChartBlock): EChartsOption {
  const data = toPieData(block)
  const unit = block.unit || ''
  return {
    color: palette(),
    tooltip: {
      trigger: 'item',
      // 函数式 formatter 返回值会直接进 innerHTML，模型可控的 name/unit 必须先转义防 XSS
      formatter: (p) => {
        const { name, value, percent } = p as PieTooltipParam
        return `${escapeHtml(String(name))}<br/>${formatNumber(value)}${escapeHtml(unit)}（${percent}%）`
      }
    },
    legend: {
      type: 'scroll', // 数据项多时图例可滚动
      orient: 'horizontal',
      bottom: 0,
      textStyle: { fontSize: 12 }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        // 数据项较多时隐藏标签，只保留图例，避免拥挤
        label: { show: data.length <= 8, formatter: '{b}: {d}%', fontSize: 12 },
        labelLine: { show: data.length <= 8 },
        data
      }
    ]
  }
}

// PART_2

/** 生成轴类图表（柱/折线）option */
function axisOption(block: ChartBlock, chartType: 'bar' | 'line'): EChartsOption {
  const isLine = chartType === 'line'
  const categories = toCategories(block, isLine)
  const series = toSeriesData(block, isLine)
  const unit = block.unit || ''
  const large = categories.length > LARGE_DATA_THRESHOLD

  return {
    color: palette(),
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => `${formatNumber(Number(v))}${unit}`
    },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 12 }, show: series.length > 1 },
    grid: { left: 8, right: 12, top: 16, bottom: large ? 48 : 32, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        fontSize: 11,
        // 标签过长/过多时旋转，避免重叠
        rotate: categories.length > 6 || categories.some((c) => c.length > 4) ? 35 : 0,
        interval: large ? 'auto' : 0,
        formatter: (v: string) => (v.length > 8 ? `${v.slice(0, 8)}…` : v)
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, formatter: (v: number) => formatNumber(v) }
    },
    // 大数据量启用缩放
    dataZoom: large
      ? [
          { type: 'inside', start: 0, end: (LARGE_DATA_THRESHOLD / categories.length) * 100 },
          { type: 'slider', height: 16, bottom: 24 }
        ]
      : undefined,
    series: series.map((s) => ({
      name: s.name,
      type: chartType,
      smooth: isLine,
      showSymbol: isLine,
      data: s.values
    }))
  }
}

/**
 * 按图表类型生成 ECharts option。
 * @param block 结构化图表块
 * @param chartType 当前图表类型
 * @returns ECharts option
 */
export function buildChartOption(block: ChartBlock, chartType: AgentChartType): EChartsOption {
  if (chartType === 'pie') return pieOption(block)
  return axisOption(block, chartType)
}

