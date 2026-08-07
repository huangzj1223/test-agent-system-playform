<!--
  组件名称：PieChart - 饼图组件

  功能描述：
    基于 ECharts 封装的饼图组件，支持环形图、玫瑰图、响应式尺寸、暗黑模式等功能

  使用方式：
    <PieChart
      :data="[
        { name: '直接访问', value: 335 },
        { name: '邮件营销', value: 310 },
        { name: '联盟广告', value: 234 },
        { name: '视频广告', value: 135 },
        { name: '搜索引擎', value: 1548 }
      ]"
      title="访问来源"
      :radius="['40%', '70%']"
      :loading="false"
    />

  Props:
    - data: 数据数组
    - title: 图表标题
    - radius: 饼图半径（数组：[内半径, 外半径]）
    - roseType: 是否显示为玫瑰图
    - colors: 饼图颜色数组
    - loading: 加载状态
    - theme: 主题模式（light/dark）
    - customOptions: 自定义 ECharts 配置
-->

<template>
  <div class="pie-chart-container">
    <div ref="chartRef" class="chart" :style="{ height: height }"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

/**
 * Props 类型定义
 * @typedef {Object} DataItem
 * @property {string} name - 数据名称
 * @property {number} value - 数据值
 *
 * @typedef {Object} Props
 * @property {DataItem[]} data - 数据数组
 * @property {string} [title=''] - 图表标题
 * @property {string[]|string} [radius='50%'] - 饼图半径
 * @property {string} [roseType=''] - 玫瑰图类型（'radius'/'area'/''）
 * @property {string[]} [colors=[]] - 饼图颜色数组
 * @property {boolean} [loading=false] - 加载状态
 * @property {string} [theme='light'] - 主题模式（light/dark）
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

  // 图表标题
  title: {
    type: String,
    default: ''
  },

  // 饼图半径
  radius: {
    type: [Array, String],
    default: '50%'
  },

  // 玫瑰图类型
  roseType: {
    type: String,
    default: '',
    validator: (value) => ['', 'radius', 'area'].includes(value)
  },

  // 饼图颜色数组
  colors: {
    type: Array,
    default: () => ['#1171F8', '#07C160', '#FF976A', '#EE0A24', '#1989FA', '#FFC107', '#9C27B0']
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
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      textStyle: {
        color: props.theme === 'dark' ? '#999' : '#969799'
      }
    },
    series: [
      {
        name: props.title || '数据',
        type: 'pie',
        radius: props.radius,
        center: ['50%', '45%'],
        roseType: props.roseType || undefined,
        data: props.data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: true,
          formatter: '{d}%',
          color: props.theme === 'dark' ? '#fff' : '#323233',
          fontSize: 12,
          fontWeight: 'bold'
        },
        itemStyle: {
          borderRadius: 4,
          borderColor: props.theme === 'dark' ? '#1a1a1a' : '#fff',
          borderWidth: 2
        }
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
  () => [props.data, props.title, props.radius, props.roseType, props.colors, props.theme],
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
.pie-chart-container {
  width: 100%;
  height: 100%;
}

.chart {
  width: 100%;
}
</style>
