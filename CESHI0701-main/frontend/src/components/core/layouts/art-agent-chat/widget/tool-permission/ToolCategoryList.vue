<!-- 工具分类导航：全部 + 7 类工具，带图标与计数，点击筛选，选中蓝色高亮 -->
<template>
  <div class="tool-cat">
    <div class="tc-title">工具分类</div>
    <ul class="tc-list">
      <li class="tc-item" :class="{ active: active === '' }" @click="emit('select', '')">
        <i class="iconfont-sys tc-icon">&#xe816;</i>
        <span class="tc-name">全部工具</span>
        <span class="tc-count">{{ totalCount }}</span>
      </li>
      <li
        v-for="c in categories"
        :key="c.key"
        class="tc-item"
        :class="{ active: active === c.key }"
        @click="emit('select', c.key)"
      >
        <i class="iconfont-sys tc-icon" v-html="iconOf(c.key)"></i>
        <span class="tc-name">{{ labelOf(c.key) }}</span>
        <span class="tc-count">{{ c.count }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { TYPE_LABELS, TYPE_ICONS, type ToolType, type ToolCategoryCount } from './types'

  defineOptions({ name: 'ToolCategoryList' })

  const props = defineProps<{
    /** 分类计数列表 */
    categories: ToolCategoryCount[]
    /** 当前激活分类（空串=全部） */
    active: string
  }>()

  const emit = defineEmits<{ select: [category: ToolType | ''] }>()

  /** 全部工具计数（各分类之和） */
  const totalCount = computed(() => props.categories.reduce((sum, c) => sum + c.count, 0))

  /** 分类 key → 显示名 */
  const labelOf = (key: ToolType) => TYPE_LABELS[key] || key
  /** 分类 key → 图标 */
  const iconOf = (key: ToolType) => TYPE_ICONS[key] || TYPE_ICONS.cli
</script>

<style lang="scss" scoped>
  .tool-cat {
    flex-shrink: 0;
    width: 200px;
    padding: 12px;
    overflow-y: auto;
    background: var(--art-gray-100);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .tc-title {
    padding: 4px 8px 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-text-gray-800);
  }

  .tc-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .tc-item {
    display: flex;
    gap: 8px;
    align-items: center;
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

    // 选中态：浅主色底 + 主色文字（与 Skills/记忆中心一致）
    &.active {
      font-weight: 500;
      color: var(--art-primary);
      background: rgba(var(--art-primary), 0.1);
    }

    .tc-icon {
      flex-shrink: 0;
      font-size: 15px;
    }

    .tc-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tc-count {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    &.active .tc-count {
      color: var(--art-primary);
    }
  }
</style>
