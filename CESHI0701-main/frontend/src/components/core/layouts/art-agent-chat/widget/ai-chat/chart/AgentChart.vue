<!-- 通用 ECharts 容器：按 option 渲染，监听窗口/容器 resize，销毁时 dispose，防重复创建 -->
<template>
  <div ref="chartRef" class="agent-chart" :style="{ height: `${height}px` }"></div>
</template>

<script setup lang="ts">
  import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
  import * as echarts from 'echarts'
  import type { EChartsOption } from 'echarts'

  defineOptions({ name: 'AgentChart' })

  const props = withDefaults(
    defineProps<{
      /** ECharts option */
      option: EChartsOption
      /** 图表高度（px） */
      height?: number
    }>(),
    { height: 300 }
  )

  /** 容器 DOM */
  const chartRef = ref<HTMLElement | null>(null)
  /** ECharts 实例（shallowRef 避免深响应式代理实例内部结构） */
  const instance = shallowRef<echarts.ECharts | null>(null)
  /** resize 观察器 */
  let resizeObserver: ResizeObserver | null = null

  /** 初始化实例（幂等：已存在则不重复创建，防内存泄漏） */
  const initChart = () => {
    if (!chartRef.value || instance.value) return
    instance.value = echarts.init(chartRef.value)
    instance.value.setOption(props.option)
  }

  /** 更新 option（notMerge 保证图表类型切换时旧系列被清除，不残留） */
  const updateChart = () => {
    if (!instance.value) {
      initChart()
      return
    }
    instance.value.setOption(props.option, { notMerge: true })
  }

  /** 尺寸自适应 */
  const resize = () => instance.value?.resize()

  onMounted(async () => {
    await nextTick()
    initChart()
    window.addEventListener('resize', resize)
    // 容器宽度变化（如侧栏展开/收起）时自适应
    if (chartRef.value) {
      resizeObserver = new ResizeObserver(() => resize())
      resizeObserver.observe(chartRef.value)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    resizeObserver?.disconnect()
    resizeObserver = null
    // 显式 dispose，释放 canvas 与事件，防内存泄漏
    instance.value?.dispose()
    instance.value = null
  })

  // option 变化（图表类型切换）时更新，不重建实例
  watch(
    () => props.option,
    () => updateChart(),
    { deep: false }
  )

  /** 暴露给父组件：获取 PNG dataURL（下载用） */
  const getDataURL = (): string =>
    instance.value?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' }) || ''

  defineExpose({ resize, getDataURL })
</script>

<style lang="scss" scoped>
  .agent-chart {
    width: 100%;
    min-height: 240px;
  }
</style>
