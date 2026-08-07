<!-- 表情选择面板：分组 tabs + 表情网格，点击某表情向父组件发出 pick 事件 -->
<template>
  <div class="emoji-panel">
    <div class="emoji-tabs">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="emoji-tab"
        :class="{ active: activeCat === cat.key }"
        type="button"
        @click="activeCat = cat.key"
      >
        {{ cat.label }}
      </button>
    </div>
    <div class="emoji-grid">
      <button
        v-for="em in activeEmojis"
        :key="em"
        class="emoji-item"
        type="button"
        @click="emit('pick', em)"
      >
        {{ em }}
      </button>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { EMOJI_CATEGORIES } from './emoji-data'

  defineOptions({ name: 'EmojiPicker' })

  const emit = defineEmits<{
    /** 选中一个表情 */
    pick: [emoji: string]
  }>()

  /** 表情类别列表 */
  const categories = EMOJI_CATEGORIES
  /** 当前选中的类别键 */
  const activeCat = ref(EMOJI_CATEGORIES[0]?.key ?? '')
  /** 当前类别下的表情列表 */
  const activeEmojis = computed(
    () => EMOJI_CATEGORIES.find((c) => c.key === activeCat.value)?.emojis ?? []
  )
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .emoji-panel {
    .emoji-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding-bottom: 8px;
      margin-bottom: 6px;
      border-bottom: 1px solid var(--art-border-color);

      .emoji-tab {
        padding: 3px 8px;
        font-size: 12px;
        color: var(--art-text-gray-600);
        cursor: pointer;
        background: transparent;
        border: none;
        border-radius: 5px;
        transition:
          background-color 0.2s,
          color 0.2s;

        &:hover {
          background: var(--art-gray-100);
        }

        &.active {
          color: #fff;
          background: var(--art-primary);
        }
      }
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 2px;
      max-height: 200px;
      overflow-y: auto;

      .emoji-item {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        background: transparent;
        border: none;
        border-radius: 5px;
        transition: background-color 0.15s;

        &:hover {
          background: var(--art-gray-100);
        }
      }
    }
  }
</style>
