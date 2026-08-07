<!-- AG-UI 推理块：默认折叠的“分析过程”，仅渲染后端明确返回的可展示内容 -->
<template>
  <div v-if="block.content" class="reasoning-block">
    <button class="rb-head" type="button" @click="expanded = !expanded">
      <i class="iconfont-sys rb-caret" :class="{ open: expanded }">&#xe6df;</i>
      <span class="rb-title">分析过程</span>
      <span v-if="block.streaming" class="rb-streaming">生成中…</span>
    </button>
    <div v-show="expanded" class="rb-body">{{ block.content }}</div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import type { AiReasoningBlock } from '@/types/aiChat'

  defineOptions({ name: 'AiReasoningBlock' })

  defineProps<{ block: AiReasoningBlock }>()

  /** 默认折叠 */
  const expanded = ref(false)
</script>

<style lang="scss" scoped>
  .reasoning-block {
    margin: 6px 0;
    overflow: hidden;
    border: 1px dashed var(--art-border-dashed-color);
    border-radius: 8px;

    .rb-head {
      display: flex;
      gap: 6px;
      align-items: center;
      width: 100%;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
      background: transparent;
      border: none;

      .rb-caret {
        font-size: 12px;
        color: var(--art-text-gray-500);
        transition: transform 0.2s;

        &.open {
          transform: rotate(90deg);
        }
      }

      .rb-title {
        color: var(--art-text-gray-600);
      }

      .rb-streaming {
        margin-left: auto;
        color: rgb(var(--art-primary));
      }
    }

    .rb-body {
      padding: 0 10px 10px;
      font-size: 12px;
      line-height: 1.6;
      color: var(--art-text-gray-600);
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
</style>
