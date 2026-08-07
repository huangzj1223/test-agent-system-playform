<!--
  组件名称：RadarChart - 雷达图组件

  功能描述：
    基于 ECharts 封装的雷达图组件，支持多维度数据对比、响应式尺寸、暗黑模式等功能

  使用方式：
    <RadarChart
      :indicator="[
        { name: '销售', max: 100 },
        { name: '管理', max: 100 },
        { name: '技术', max: 100 }
      ]"
      :seriesData="[
        { name: '预算', value: [43, 85, 70] },
        { name: '实际', value: [50, 80, 90] }
      ]"
      :loading="false"
    />

  Props:
    - indicator: 雷达图指标配置数组
    - seriesData: 数据系列数组
    - legend: 图例数组
    - colors: 颜色数组
    - loading: 加载状态
    - theme: 主题模式（light/dark）
    - customOptions: 自定义 ECharts 配置
-->

<template>
  <div class="radar-chart-container">
    <div ref="chartRef" class="chart" :style="{ height: height }"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

/**
 * Props 类型定义
 * @typedef {Object} IndicatorItem
 * @property {string} name - 指标名称
 * @property {number} max - 最大值
 *
 * @typedef {Object} SeriesItem
 * @property {string} name - 系列名称
 * @property {number[]} value - 系列数据
 *
 * @typedef {Object} Props
 * @property {IndicatorItem[]} indicator - 雷达图指标配置
 * @property {SeriesItem[]} seriesData - 数据系列数组
 * @property {string[]} [legend=[]] - 图例数组
 * @property {string[]} [colors=[]] - 颜色数组
 * @property {boolean} [loading=false] - 加载状态
 * @property {string} [theme='light'] - 主题模式（light/dark）
 * @property {string} [height='300px'] - 图表高度
 * @property {Object} [customOptions={}] - 自定义 ECharts 配置
 */

// Props 定义
const props = defineProps({
  // 雷达图指标配置
  indicator: {
    type: Array,
    required: true,
    default: () => []
  },

  // 数据系列数组
  seriesData: {
    type: Array,
    required: true,
    default: () => []
  },

  // 图例数组
  legend: {
    type: Array,
    default: () => []
  },

  // 颜色数组
  colors: {
    type: Array,
    default: () => ['#1171F8', '#07C160', '#FF976A', '#EE0A24', '#1989FA']
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
    value: item.value,
    itemStyle: {
      color: props.colors[index % props.colors.length]
    },
    lineStyle: {
      color: props.colors[index % props.colors.length]
    },
    areaStyle: {
      color: props.colors[index % props.colors.length],
      opacity: 0.3
    }
  }))

  // 基础配置
  const baseOptions = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      data: props.legend.length > 0 ? props.legend : props.seriesData.map((item) => item.name),
      bottom: '0%',
      left: 'center',
      textStyle: {
        color: props.theme === 'dark' ? '#999' : '#969799'
      }
    },
    radar: {
      indicator: props.indicator,
      center: ['50%', '50%'],
      radius: '60%',
      splitNumber: 4,
      name: {
        textStyle: {
          color: props.theme === 'dark' ? '#999' : '#969799'
        }
      },
      splitLine: {
        lineStyle: {
          color: props.theme === 'dark' ? '#333' : '#ebedf0'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: props.theme === 'dark' ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']
        }
      },
      axisLine: {
        lineStyle: {
          color: props.theme === 'dark' ? '#666' : '#ebedf0'
        }
      }
    },
    series: [
      {
        type: 'radar',
        data: series
      }
    ],
    color: props.colors
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
  () => [props.indicator, props.seriesData, props.legend, props.colors, props.theme],
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
.radar-chart-container {
  width: 100%;
  height: 100%;
}

.chart {
  width: 100%;
}
</style>
