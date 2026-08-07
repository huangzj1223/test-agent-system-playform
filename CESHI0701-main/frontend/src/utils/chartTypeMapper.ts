/**
 * 图表类型映射工具
 * 将图表ID转换为中文名称
 */

/**
 * 图表类型ID到中文名称的映射表
 */
const CHART_TYPE_NAME_MAP: Record<string, string> = {
  // 柱状图
  'column-basic': '基础柱状图',
  'column-grouped': '分组柱状图',
  'column-stacked': '堆叠柱状图',

  // 条形图
  'bar-basic': '基础条形图',
  'bar-grouped': '分组条形图',
  'bar-stacked': '堆叠条形图',

  // 折线图
  'line-basic': '基础折线图',
  'line-comparison': '对比折线图',

  // 面积图
  'area-basic': '基础面积图',
  'area-stacked': '堆叠面积图',

  // 饼图
  'pie-basic': '基础饼图',
  'pie-donut': '环形图',

  // 雷达图
  'radar-basic': '基础雷达图'
}

/**
 * 获取图表类型的中文名称
 * @param chartId 图表类型ID（如 'column-basic', 'line-comparison' 等）
 * @returns 图表类型的中文名称（如 '基础柱状图', '对比折线图' 等）
 */
export function getChartTypeName(chartId?: string | null): string {
  if (!chartId) {
    return '未知类型'
  }

  return CHART_TYPE_NAME_MAP[chartId] || '未知类型'
}

/**
 * 从图表配置对象中提取图表类型ID
 * 用于处理历史数据（chartConfig是JSON字符串）
 * @param chartConfig 图表配置JSON字符串或对象
 * @returns 图表类型ID
 */
export function extractChartTypeFromConfig(chartConfig: string | any): string | null {
  try {
    // 如果是字符串，先解析
    const config = typeof chartConfig === 'string' ? JSON.parse(chartConfig) : chartConfig

    // 优先读取 _chartId 字段
    if (config?._chartId) {
      return config._chartId
    }

    // 返回null，让调用方使用fallback逻辑
    return null
  } catch (error) {
    console.error('解析图表配置失败:', error)
    return null
  }
}
