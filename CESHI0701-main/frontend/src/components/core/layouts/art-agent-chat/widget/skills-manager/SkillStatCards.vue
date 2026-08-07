<!-- Skills 管理台顶部统计卡片：全部/已启用/高风险/近7日调用/失效率 -->
<template>
  <div class="stat-cards">
    <div v-for="c in cards" :key="c.key" class="stat-card">
      <div class="stat-icon" :class="`is-${c.key}`">
        <i class="iconfont-sys" v-html="c.icon"></i>
      </div>
      <div class="stat-body">
        <div class="stat-label">{{ c.label }}</div>
        <div class="stat-value">{{ c.value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { SkillStats } from '@/api/agentSkill'

  defineOptions({ name: 'SkillStatCards' })

  const props = defineProps<{ stats: SkillStats }>()

  /** 5 张卡片配置（图标用 iconfont 占位字符） */
  const cards = computed(() => [
    { key: 'total', label: '全部 Skills', value: props.stats.total, icon: '&#xe816;' },
    { key: 'enabled', label: '已启用', value: props.stats.enabled, icon: '&#xe72e;' },
    { key: 'risk', label: '高风险', value: props.stats.highRisk, icon: '&#xe6a2;' },
    { key: 'calls', label: '近7日调用', value: props.stats.calls7d, icon: '&#xe70b;' },
    { key: 'fail', label: '失效率', value: `${props.stats.failRate}%`, icon: '&#xe6a1;' }
  ])
</script>

<style lang="scss" scoped>
  .stat-cards {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .stat-icon {
    display: flex;
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
    &.is-fail {
      color: #ea580c;
      background: rgba(234, 88, 12, 0.1);
    }
  }

  .stat-label {
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  .stat-value {
    margin-top: 2px;
    font-size: 22px;
    font-weight: 600;
    color: var(--art-text-gray-900);
  }
</style>
