/**
 * 文件名称：index.js - ECharts 图表组件统一导出
 *
 * 功能描述：
 *   统一导出所有 ECharts 图表组件，方便在项目中使用
 *
 * 使用方式：
 *   // 导入单个组件
 *   import { BarChart } from '@/components/Common/Charts'
 *
 *   // 导入多个组件
 *   import { BarChart, LineChart, PieChart } from '@/components/Common/Charts'
 *
 * 可用组件：
 *   - BarChart: 基础柱状图
 *   - MultiBarChart: 多组柱状图
 *   - StackBarChart: 堆叠柱状图
 *   - LineChart: 折线图
 *   - PieChart: 饼图
 *   - RadarChart: 雷达图
 *   - RoseChart: 玫瑰图
 */

import BarChart from './BarChart.vue'
import MultiBarChart from './MultiBarChart.vue'
import StackBarChart from './StackBarChart.vue'
import LineChart from './LineChart.vue'
import PieChart from './PieChart.vue'
import RadarChart from './RadarChart.vue'
import RoseChart from './RoseChart.vue'

export { BarChart, MultiBarChart, StackBarChart, LineChart, PieChart, RadarChart, RoseChart }

export default {
  BarChart,
  MultiBarChart,
  StackBarChart,
  LineChart,
  PieChart,
  RadarChart,
  RoseChart
}
