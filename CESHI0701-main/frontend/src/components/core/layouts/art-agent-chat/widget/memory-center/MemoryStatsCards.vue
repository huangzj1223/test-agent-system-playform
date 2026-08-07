<!-- 记忆中心顶部统计卡片：记忆文件/待确认/最近更新/命中率/高风险 -->
<template>
  <div class="mem-stat-cards">
    <div v-for="c in cards" :key="c.key" class="mem-stat-card">
      <div class="mem-stat-icon" :class="`is-${c.key}`">
        <i class="iconfont-sys" v-html="c.icon"></i>
      </div>
      <div class="mem-stat-body">
        <div class="mem-stat-label">{{ c.label }}</div>
        <div class="mem-stat-value">{{ c.value }}</div>
        <div class="mem-stat-hint">{{ c.hint }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { MemoryStats } from './memory-constants'

  defineOptions({ name: 'MemoryStatsCards' })

  const props = defineProps<{
    /** 统计概览 */
    stats: MemoryStats
    /** 待确认数量（随交互实时变化，覆盖 stats.pendingCount 展示） */
    pendingCount: number
  }>()

  /** 5 张卡片配置（图标用 iconfont 占位字符） */
  const cards = computed(() => [
    { key: 'files', label: '记忆文件', value: props.stats.fileCount, hint: '长期记忆文件总数', icon: '&#xe816;' },
    { key: 'pending', label: '待确认记忆', value: props.pendingCount, hint: '等待人工确认写入', icon: '&#xe70b;' },
    { key: 'update', label: '最近更新', value: props.stats.lastUpdate, hint: '最后一次记忆变更', icon: '&#xe6a3;' },
    { key: 'hit', label: '记忆命中率', value: props.stats.hitRate, hint: '近期对话记忆引用率', icon: '&#xe72e;' },
    { key: 'risk', label: '高风险记忆', value: props.stats.highRisk, hint: '需重点关注的记忆', icon: '&#xe6a2;' }
  ])
</script>

<style lang="scss" scoped>
  .mem-stat-cards {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .mem-stat-card {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .mem-stat-icon {
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
    &.is-files {
      color: var(--art-primary);
      background: rgba(var(--art-primary), 0.1);
    }
    &.is-pending {
      color: #ea580c;
      background: rgba(234, 88, 12, 0.1);
    }
    &.is-update {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
    }
    &.is-hit {
      color: #7c3aed;
      background: rgba(124, 58, 237, 0.1);
    }
    &.is-risk {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }
  }

  .mem-stat-body {
    min-width: 0;
  }

  .mem-stat-label {
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  .mem-stat-value {
    margin-top: 2px;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--art-text-gray-900);
  }

  .mem-stat-hint {
    margin-top: 2px;
    overflow: hidden;
    font-size: 11px;
    color: var(--art-text-gray-400);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
