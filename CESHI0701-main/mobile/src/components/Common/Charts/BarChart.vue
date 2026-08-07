<!--
  组件名称：BarChart - 基础柱状图组件

  功能描述：
    基于 ECharts 封装的基础柱状图组件，支持横向/纵向柱状图、响应式尺寸、暗黑模式等功能

  使用方式：
    <BarChart
      :data="[120, 200, 150, 80, 70, 110]"
      :xAxisData="['1月', '2月', '3月', '4月', '5月', '6月']"
      title="月度销售额"
      :loading="false"
    />

  Props:
    - data: 数据数组
    - xAxisData: X轴数据数组
    - title: 图表标题
    - color: 柱状图颜色（默认使用项目主色调）
    - loading: 加载状态
    - theme: 主题模式（light/dark）
    - horizontal: 是否横向显示
    - customOptions: 自定义 ECharts 配置
-->

<template>
  <div class="bar-chart-container">
    <div ref="chartRef" class="chart" :style="{ height: height }"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

/**
 * Props 类型定义
 * @typedef {Object} Props
 * @property {number[]} data - 数据数组
 * @property {string[]} xAxisData - X轴数据数组
 * @property {string} [title=''] - 图表标题
 * @property {string} [color='#1171F8'] - 柱状图颜色
 * @property {boolean} [loading=false] - 加载状态
 * @property {string} [theme='light'] - 主题模式（light/dark）
 * @property {boolean} [horizontal=false] - 是否横向显示
 * @property {string} [height='300px'] - 图表高度
 * @property {Object} [customOptions={}] - 自定义 ECharts 配置
 */

// Props 定义
const props = defineProps({
  // 数据数组
  data: {
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

  // 图表标题
  title: {
    type: String,
    default: ''
  },

  // 柱状图颜色
  color: {
    type: String,
    default: '#1171F8'
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

  // 是否横向显示
  horizontal: {
    type: Boolean,
    default: false
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
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: props.title ? '15%' : '3%',
      containLabel: true
    },
    xAxis: props.horizontal
      ? {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: props.theme === 'dark' ? '#666' : '#ebedf0'
            }
          },
          axisLabel: {
            color: props.theme === 'dark' ? '#999' : '#969799'
          }
        }
      : {
          type: 'category',
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
    yAxis: props.horizontal
      ? {
          type: 'category',
          data: props.xAxisData,
          axisLine: {
            lineStyle: {
              color: props.theme === 'dark' ? '#666' : '#ebedf0'
            }
          },
          axisLabel: {
            color: props.theme === 'dark' ? '#999' : '#969799'
          }
        }
      : {
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
    series: [
      {
        type: 'bar',
        data: props.data,
        itemStyle: {
          color: props.color,
          borderRadius: props.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
        },
        barWidth: '60%'
      }
    ]
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
      color: props.color,
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
  () => [props.data, props.xAxisData, props.title, props.color, props.theme, props.horizontal],
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
.bar-chart-container {
  width: 100%;
  height: 100%;
}

.chart {
  width: 100%;
}
</style>
