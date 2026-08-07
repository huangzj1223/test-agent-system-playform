<!-- Skills 管理台左侧分类侧栏：全部 + 各分类，带计数，点击筛选 -->
<template>
  <div class="cat-sidebar">
    <div class="cat-title">Skills 分类</div>
    <ul class="cat-list">
      <li
        class="cat-item"
        :class="{ active: active === '' }"
        @click="emit('select', '')"
      >
        <span class="cat-name">全部 Skills</span>
        <span class="cat-count">{{ data.total }}</span>
      </li>
      <li
        v-for="c in data.categories"
        :key="c.key"
        class="cat-item"
        :class="{ active: active === c.key }"
        @click="emit('select', c.key)"
      >
        <span class="cat-name">{{ labelOf(c.key) }}</span>
        <span class="cat-count">{{ c.count }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import type { SkillCategory, SkillCategoryCount } from '@/api/agentSkill'
  import { CATEGORY_LABELS } from './skill-constants'

  defineOptions({ name: 'SkillCategorySidebar' })

  defineProps<{
    /** 分类计数数据 */
    data: SkillCategoryCount
    /** 当前激活分类（空串表示全部） */
    active: string
  }>()

  const emit = defineEmits<{ select: [category: string] }>()

  /** 分类 key → 显示名 */
  const labelOf = (key: SkillCategory) => CATEGORY_LABELS[key] || key
</script>

<style lang="scss" scoped>
  .cat-sidebar {
    flex-shrink: 0;
    width: 180px;
    padding: 12px;
    background: var(--art-gray-100);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .cat-title {
    padding: 4px 8px 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-text-gray-800);
  }

  .cat-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .cat-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    margin-bottom: 2px;
    font-size: 13px;
    color: var(--art-text-gray-700);
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.15s;

    &:hover {
      background: var(--art-gray-200);
    }

    &.active {
      color: var(--art-primary);
      background: rgba(var(--art-primary), 0.1);
      font-weight: 500;
    }
  }

  .cat-count {
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  .cat-item.active .cat-count {
    color: var(--art-primary);
  }
</style>
