<!-- 工具权限顶部统计卡片：全部工具/已启用/高风险/今日调用 -->
<template>
  <div class="tool-stat-cards">
    <div v-for="c in cards" :key="c.key" class="tool-stat-card">
      <div class="tsc-icon" :class="`is-${c.key}`">
        <i class="iconfont-sys" v-html="c.icon"></i>
      </div>
      <div class="tsc-body">
        <div class="tsc-label">{{ c.label }}</div>
        <div class="tsc-value">{{ c.value }}</div>
        <div class="tsc-hint">{{ c.hint }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { ToolStats } from './types'

  defineOptions({ name: 'ToolStatsCards' })

  const props = defineProps<{ stats: ToolStats }>()

  /** 4 张卡片配置（图标用 iconfont 占位字符） */
  const cards = computed(() => [
    { key: 'total', label: '全部工具', value: props.stats.total, hint: '已注册工具总数', icon: '&#xe816;' },
    { key: 'enabled', label: '已启用', value: props.stats.enabled, hint: '当前可被调用', icon: '&#xe72e;' },
    { key: 'risk', label: '高风险工具', value: props.stats.highRisk, hint: 'L3/L4 需重点管控', icon: '&#xe6a2;' },
    { key: 'calls', label: '今日调用次数', value: props.stats.callsToday, hint: '今日累计调用', icon: '&#xe70b;' }
  ])
</script>

<style lang="scss" scoped>
  .tool-stat-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .tool-stat-card {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .tsc-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;

    i {
      font-size: 20px;
    }

    // 每类卡片用不同色调区分（克制：仅图标底色）
    &.is-total {
      color: var(--art-primary);
      background: rgba(var(--art-primary), 0.1);
    }
    &.is-enabled {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
    }
    &.is-risk {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }
    &.is-calls {
      color: #7c3aed;
      background: rgba(124, 58, 237, 0.1);
    }
  }

  .tsc-body {
    min-width: 0;
  }

  .tsc-label {
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  .tsc-value {
    margin-top: 2px;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--art-text-gray-900);
  }

  .tsc-hint {
    margin-top: 2px;
    overflow: hidden;
    font-size: 11px;
    color: var(--art-text-gray-400);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
