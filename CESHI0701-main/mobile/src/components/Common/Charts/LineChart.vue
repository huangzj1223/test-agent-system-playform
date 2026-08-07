<!--
  组件名称：LineChart - 折线图组件

  功能描述：
    基于 ECharts 封装的折线图组件，支持多条折线、平滑曲线、面积图、响应式尺寸、暗黑模式等功能

  使用方式：
    <LineChart
      :seriesData="[
        { name: '销售额', data: [120, 200, 150, 80, 70, 110] },
        { name: '利润', data: [80, 120, 100, 50, 40, 70] }
      ]"
      :xAxisData="['1月', '2月', '3月', '4月', '5月', '6月']"
      :legend="['销售额', '利润']"
      title="月度趋势"
      :smooth="true"
      :area="false"
      :loading="false"
    />

  Props:
    - seriesData: 数据系列数组
    - xAxisData: X轴数据数组
    - legend: 图例数组
    - title: 图表标题
    - colors: 折线颜色数组
    - smooth: 是否平滑曲线
    - area: 是否显示面积图
    - loading: 加载状态
    - theme: 主题模式（light/dark）
    - customOptions: 自定义 ECharts 配置
-->

<template>
  <div class="line-chart-container">
    <div ref="chartRef" class="chart" :style="{ height: height }"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

/**
 * Props 类型定义
 * @typedef {Object} SeriesItem
 * @property {string} name - 系列名称
 * @property {number[]} data - 系列数据
 *
 * @typedef {Object} Props
 * @property {SeriesItem[]} seriesData - 数据系列数组
 * @property {string[]} xAxisData - X轴数据数组
 * @property {string[]} [legend=[]] - 图例数组
 * @property {string} [title=''] - 图表标题
 * @property {string[]} [colors=[]] - 折线颜色数组
 * @property {boolean} [smooth=false] - 是否平滑曲线
 * @property {boolean} [area=false] - 是否显示面积图
 * @property {boolean} [loading=false] - 加载状态
 * @property {string} [theme='light'] - 主题模式（light/dark）
 * @property {string} [height='300px'] - 图表高度
 * @property {Object} [customOptions={}] - 自定义 ECharts 配置
 */

// Props 定义
const props = defineProps({
  // 数据系列数组
  seriesData: {
    type: Array,
    required: true,
    default: () => []
  },

  // X轴数据数组
  xAxisData: {
    type: Array,
    required: true,
    default: () => []
  },

  // 图例数组
  legend: {
    type: Array,
    default: () => []
  },

  // 图表标题
  title: {
    type: String,
    default: ''
  },

  // 折线颜色数组
  colors: {
    type: Array,
    default: () => ['#1171F8', '#07C160', '#FF976A', '#EE0A24', '#1989FA']
  },

  // 是否平滑曲线
  smooth: {
    type: Boolean,
    default: false
  },

  // 是否显示面积图
  area: {
    type: Boolean,
    default: false
  },

  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },

  // 主题模式
  theme: {
    type: String,
    default: 'light',
    validator: (value) => ['light', 'dark'].includes(value)
  },

  // 图表高度
  height: {
    type: String,
    default: '300px'
  },

  // 自定义 ECharts 配置
  customOptions: {
    type: Object,
    default: () => ({})
  }
})

// 响应式数据
/** @type {import('vue').Ref<HTMLElement|null>} */
const chartRef = ref(null)

/** @type {import('vue').Ref<echarts.ECharts|null>} */
let chartInstance = null

/**
 * 初始化图表
 */
const initChart = () => {
  if (!chartRef.value) return

  // 如果已存在实例，先销毁
  if (chartInstance) {
    chartInstance.dispose()
  }

  // 创建 ECharts 实例
  chartInstance = echarts.init(chartRef.value, props.theme)

  // 设置图表配置
  updateChart()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

/**
 * 更新图表配置
 */
const updateChart = () => {
  if (!chartInstance) return

  // 构建系列数据
  const series = props.seriesData.map((item, index) => ({
    name: item.name,
    type: 'line',
    data: item.data,
    smooth: props.smooth,
    itemStyle: {
      color: props.colors[index % props.colors.length]
    },
    lineStyle: {
      width: 2,
      color: props.colors[index % props.colors.length]
    },
    areaStyle: props.area
      ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: props.colors[index % props.colors.length] + '40'
              },
              {
                offset: 1,
                color: props.colors[index % props.colors.length] + '10'
              }
            ]
          }
        }
      : undefined,
    emphasis: {
      focus: 'series'
    }
  }))

  // 基础配置
  const baseOptions = {
    title: {
      text: props.title,
      left: 'center',
      textStyle: {
        color: props.theme === 'dark' ? '#fff' : '#323233',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: props.legend.length > 0 ? props.legend : props.seriesData.map((item) => item.name),
      top: props.title ? '10%' : '3%',
      textStyle: {
        color: props.theme === 'dark' ? '#999' : '#969799'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: props.title ? '20%' : '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.xAxisData,
      axisLine: {
        lineStyle: {
          color: props.theme === 'dark' ? '#666' : '#ebedf0'
        }
      },
      axisLabel: {
        color: props.theme === 'dark' ? '#999' : '#969799'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: props.theme === 'dark' ? '#666' : '#ebedf0'
        }
      },
      axisLabel: {
        color: props.theme === 'dark' ? '#999' : '#969799'
      },
      splitLine: {
        lineStyle: {
          color: props.theme === 'dark' ? '#333' : '#ebedf0'
        }
      }
    },
    series
  }

  // 合并自定义配置
  const options = Object.assign({}, baseOptions, props.customOptions)

  // 设置配置项
  chartInstance.setOption(options, true)
}

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

/**
 * 显示加载动画
 */
const showLoading = () => {
  if (chartInstance) {
    chartInstance.showLoading({
      text: '加载中...',
      color: props.colors[0],
      textColor: props.theme === 'dark' ? '#fff' : '#323233',
      maskColor: props.theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)'
    })
  }
}

/**
 * 隐藏加载动画
 */
const hideLoading = () => {
  if (chartInstance) {
    chartInstance.hideLoading()
  }
}

// 监听 loading 状态变化
watch(
  () => props.loading,
  (newVal) => {
    if (newVal) {
      showLoading()
    } else {
      hideLoading()
    }
  }
)

// 监听数据变化
watch(
  () => [props.seriesData, props.xAxisData, props.legend, props.title, props.colors, props.theme, props.smooth, props.area],
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true }
)

// 监听自定义配置变化
watch(
  () => props.customOptions,
  () => {
    nextTick(() => {
      updateChart()
    })
  },
  { deep: true }
)

// 生命周期钩子
onMounted(() => {
  nextTick(() => {
    initChart()
    if (props.loading) {
      showLoading()
    }
  })
})

onBeforeUnmount(() => {
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)

  // 销毁图表实例
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.line-chart-container {
  width: 100%;
  height: 100%;
}

.chart {
  width: 100%;
}
</style>
