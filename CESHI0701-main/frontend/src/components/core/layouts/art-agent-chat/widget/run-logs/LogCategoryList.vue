<!-- 运行日志分类导航：全部 + 6 类日志，带图标与计数，点击筛选，选中蓝色高亮 -->
<template>
  <div class="log-cat">
    <div class="lc-title">日志分类</div>
    <ul class="lc-list">
      <li class="lc-item" :class="{ active: active === '' }" @click="emit('select', '')">
        <i class="iconfont-sys lc-icon">&#xe816;</i>
        <span class="lc-name">全部日志</span>
        <span class="lc-count">{{ totalCount }}</span>
      </li>
      <li
        v-for="c in categories"
        :key="c.key"
        class="lc-item"
        :class="{ active: active === c.key }"
        @click="emit('select', c.key)"
      >
        <i class="iconfont-sys lc-icon" v-html="iconOf(c.key)"></i>
        <span class="lc-name">{{ labelOf(c.key) }}</span>
        <span class="lc-count">{{ c.count }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { CATEGORY_ICONS, getLogTypeLabel, type LogType, type LogCategoryCount } from './runLogTypes'

  defineOptions({ name: 'LogCategoryList' })

  const props = defineProps<{
    /** 分类计数列表 */
    categories: LogCategoryCount[]
    /** 当前激活分类（空串=全部） */
    active: string
  }>()

  const emit = defineEmits<{ select: [category: LogType | ''] }>()

  /** 全部日志计数（各分类之和） */
  const totalCount = computed(() => props.categories.reduce((sum, c) => sum + c.count, 0))

  /** 分类 key → 显示名 */
  const labelOf = (key: LogType) => getLogTypeLabel(key)
  /** 分类 key → 图标 */
  const iconOf = (key: LogType) => CATEGORY_ICONS[key] || CATEGORY_ICONS.conversation
</script>

<style lang="scss" scoped>
  .log-cat {
    flex-shrink: 0;
    width: 200px;
    padding: 12px;
    overflow-y: auto;
    background: var(--art-gray-100);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .lc-title {
    padding: 4px 8px 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-text-gray-800);
  }

  .lc-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .lc-item {
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

    // 选中态：浅主色底 + 主色文字（与工具权限/记忆中心一致）
    &.active {
      font-weight: 500;
      color: var(--art-primary);
      background: rgba(var(--art-primary), 0.1);
    }

    .lc-icon {
      flex-shrink: 0;
      font-size: 15px;
    }

    .lc-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .lc-count {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    &.active .lc-count {
      color: var(--art-primary);
    }
  }
</style>
