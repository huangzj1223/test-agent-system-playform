<!-- 图表类型切换：pie/bar/line，仅切换显示，不重查数据，当前类型高亮 -->
<template>
  <div class="chart-type-switcher">
    <el-tooltip
      v-for="opt in options"
      :key="opt.type"
      :content="opt.label"
      placement="top"
    >
      <button
        class="switch-btn"
        type="button"
        :class="{ 'is-active': opt.type === modelValue, 'is-disabled': !available(opt.type) }"
        :disabled="!available(opt.type)"
        @click="onSwitch(opt.type)"
      >
        <el-icon :size="15"><component :is="opt.icon" /></el-icon>
      </button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
  import { PieChart, Histogram, TrendCharts } from '@element-plus/icons-vue'
  import type { Component } from 'vue'
  import type { AgentChartType } from '@/types/agent-message'

  defineOptions({ name: 'ChartTypeSwitcher' })

  const props = defineProps<{
    /** 当前图表类型 */
    modelValue: AgentChartType
    /** 该图表支持的类型 */
    supportedTypes: AgentChartType[]
  }>()

  const emit = defineEmits<{
    'update:modelValue': [type: AgentChartType]
  }>()

  /** 三种图表类型的图标（Element Plus 官方图标，语义明确） */
  const options: Array<{ type: AgentChartType; label: string; icon: Component }> = [
    { type: 'pie', label: '饼图', icon: PieChart },
    { type: 'bar', label: '柱状图', icon: Histogram },
    { type: 'line', label: '折线图', icon: TrendCharts }
  ]

  /** 该类型是否可用（不在 supportedTypes 内则禁用） */
  const available = (type: AgentChartType): boolean => props.supportedTypes.includes(type)

  /** 切换（仅当可用且非当前项） */
  const onSwitch = (type: AgentChartType) => {
    if (!available(type) || type === props.modelValue) return
    emit('update:modelValue', type)
  }
</script>

<style lang="scss" scoped>
  .chart-type-switcher {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    background: var(--art-gray-100);
    border-radius: 8px;

    .switch-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 24px;
      color: var(--art-text-gray-600);
      cursor: pointer;
      background: transparent;
      border: none;
      border-radius: 6px;
      transition: all 0.2s;

      i {
        font-size: 14px;
      }

      &:hover:not(.is-disabled) {
        color: rgb(var(--art-primary));
      }

      // 当前选中：白底 + 主色，形成高亮态
      &.is-active {
        color: rgb(var(--art-primary));
        background: var(--art-main-bg-color);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
      }

      &.is-disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
    }
  }
</style>
