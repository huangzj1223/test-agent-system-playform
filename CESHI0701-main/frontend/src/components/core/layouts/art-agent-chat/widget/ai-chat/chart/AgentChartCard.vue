<!-- 智能体图表卡片：标题 + 类型切换 + 工具栏 + ECharts + 底部元信息，含空/错状态、全屏、下载 -->
<template>
  <div class="agent-chart-card">
    <!-- 顶部：标题 + 类型切换 + 工具栏 -->
    <div class="card-header">
      <div class="header-left">
        <div class="chart-title">{{ block.title }}</div>
        <div v-if="block.description" class="chart-desc">{{ block.description }}</div>
      </div>
      <div class="header-right">
        <ChartTypeSwitcher
          v-model="chartType"
          :supported-types="block.supportedTypes"
        />
        <ChartToolbar
          :is-fullscreen="isFullscreen"
          @refresh="refresh"
          @view-data="showRawData = true"
          @download="download"
          @toggle-fullscreen="toggleFullscreen"
        />
      </div>
    </div>

    <!-- 中间：图表 / 空状态 -->
    <div class="card-body">
      <div v-if="isEmpty" class="chart-empty">
        <el-empty description="暂无可展示数据" :image-size="60" />
      </div>
      <AgentChart
        v-else
        ref="chartComp"
        :option="option"
        :height="isFullscreen ? fullscreenHeight : 300"
      />
    </div>

    <!-- 底部：数据来源 / 条数 / 单位 -->
    <div class="card-footer">
      <span>数据条数：{{ block.data.length }}</span>
      <span v-if="block.unit">单位：{{ block.unit }}</span>
      <span v-if="truncated" class="footer-warn">仅展示前 {{ axisMax }} 条</span>
    </div>

    <!-- 原始数据抽屉 -->
    <el-drawer v-model="showRawData" title="原始数据" size="80%" direction="btt">
      <AgentDataTable :block="rawTableBlock" />
    </el-drawer>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import AgentChart from './AgentChart.vue'
  import ChartTypeSwitcher from './ChartTypeSwitcher.vue'
  import ChartToolbar from './ChartToolbar.vue'
  import AgentDataTable from '../table/AgentDataTable.vue'
  import { buildChartOption } from './chartOptionFactory'
  import { isChartDataEmpty, isAxisTruncated, AXIS_MAX_POINTS } from './chart-data-transform'
  import type { ChartBlock, TableBlock, AgentChartType } from '@/types/agent-message'

  defineOptions({ name: 'AgentChartCard' })

  const props = defineProps<{
    /** 结构化图表块 */
    block: ChartBlock
    /** 外部保存的当前图表类型（用于持久化切换状态） */
    initialType?: AgentChartType
  }>()

  const emit = defineEmits<{
    /** 图表类型变化，供上层保存到 chartState */
    'type-change': [type: AgentChartType]
  }>()

  /** 当前图表类型（默认取外部状态，否则块的默认类型） */
  const chartType = ref<AgentChartType>(props.initialType || props.block.defaultType)
  /** 全屏态 */
  const isFullscreen = ref(false)
  /** 原始数据抽屉 */
  const showRawData = ref(false)
  /** AgentChart 组件引用（下载/刷新用） */
  const chartComp = ref<InstanceType<typeof AgentChart> | null>(null)

  /** 全屏时的图表高度 */
  const fullscreenHeight = computed(() =>
    typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.6) : 360
  )

  /** 数据是否为空 */
  const isEmpty = computed(() => isChartDataEmpty(props.block))

  /** 轴类图表数据量上限（供提示） */
  const axisMax = AXIS_MAX_POINTS
  /** 当前是否为轴类图表且数据被截断（饼图有 Top N 合并，不提示） */
  const truncated = computed(
    () => chartType.value !== 'pie' && isAxisTruncated(props.block)
  )

  /** 当前图表 option（仅按 chartType 重新生成，不重查数据） */
  const option = computed(() => buildChartOption(props.block, chartType.value))

  /** 原始数据表格块（由图表数据反构，供抽屉展示） */
  const rawTableBlock = computed<TableBlock>(() => ({
    type: 'table',
    title: props.block.title,
    columns: [
      { key: props.block.categoryField, title: props.block.categoryField, dataType: 'string' },
      ...props.block.valueFields.map((f) => ({ key: f, title: f, dataType: 'number' as const }))
    ],
    rows: props.block.data
  }))

  /** 切换图表类型时上报，供上层持久化 */
  watch(chartType, (t) => emit('type-change', t))

  /** 刷新：强制重新 resize（数据不变，仅重绘） */
  const refresh = () => chartComp.value?.resize()

  /** 切换全屏 */
  const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value
  }

  /** 下载 PNG（ECharts getDataURL） */
  const download = () => {
    const url = chartComp.value?.getDataURL()
    if (!url) {
      ElMessage.warning('图表尚未就绪')
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.block.title || 'chart'}.png`
    a.click()
  }
</script>

<style lang="scss" scoped>
  .agent-chart-card {
    margin: 10px 0;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;

    .card-header {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid var(--art-border-dashed-color, var(--art-border-color));

      .chart-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--art-text-gray-900);
      }

      .chart-desc {
        margin-top: 2px;
        font-size: 12px;
        color: var(--art-text-gray-500);
      }

      .header-right {
        display: flex;
        flex-shrink: 0;
        gap: 6px;
        align-items: center;
      }
    }

    .card-body {
      padding: 8px 4px;
    }

    .chart-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 240px;
    }

    .card-footer {
      display: flex;
      gap: 14px;
      padding: 6px 12px 10px;
      font-size: 11px;
      color: var(--art-text-gray-400);

      .footer-warn {
        color: rgb(var(--art-warning, 250 173 20));
      }
    }
  }
</style>
