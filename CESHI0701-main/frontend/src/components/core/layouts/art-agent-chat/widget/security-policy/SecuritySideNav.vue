<!-- 安全策略左侧分类导航：6 分类，图标+名称，选中蓝色高亮 -->
<template>
  <div class="sec-nav">
    <ul class="sn-list">
      <li
        v-for="nav in CATEGORY_NAV"
        :key="nav.key"
        class="sn-item"
        :class="{ active: active === nav.key }"
        @click="emit('select', nav.key)"
      >
        <i class="iconfont-sys sn-icon" v-html="nav.icon"></i>
        <span class="sn-name">{{ nav.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { CATEGORY_NAV, type SecurityCategory } from './types'

  defineOptions({ name: 'SecuritySideNav' })

  defineProps<{
    /** 当前激活分类 */
    active: SecurityCategory
  }>()

  const emit = defineEmits<{ select: [category: SecurityCategory] }>()
</script>

<style lang="scss" scoped>
  .sec-nav {
    flex-shrink: 0;
    width: 200px;
    padding: 12px;
    overflow-y: auto;
    background: var(--art-gray-100);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .sn-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .sn-item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    margin-bottom: 4px;
    font-size: 13px;
    color: var(--art-text-gray-700);
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.15s;

    &:hover {
      background: var(--art-gray-200);
    }

    // 选中态：浅主色底 + 主色文字（与其他页签导航一致）
    &.active {
      font-weight: 500;
      color: var(--art-primary);
      background: rgba(var(--art-primary), 0.1);
    }

    .sn-icon {
      flex-shrink: 0;
      font-size: 16px;
    }

    .sn-name {
      flex: 1;
    }
  }
</style>
