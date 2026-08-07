<!-- 日志代码块：浅灰背景展示 JSON / stdout / stderr / 错误堆栈，支持换行与滚动 -->
<template>
  <div class="log-code-block">
    <div v-if="label" class="lcb-label">{{ label }}</div>
    <pre class="lcb-pre"><code>{{ displayContent }}</code></pre>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ name: 'LogCodeBlock' })

  const props = defineProps<{
    /** 可选小标题 */
    label?: string
    /** 代码内容（对象将序列化为 JSON 文本） */
    content: unknown
  }>()

  /** 归一化展示内容：对象转 JSON，空值转占位 */
  const displayContent = computed(() => {
    const c = props.content
    if (c === null || c === undefined || c === '') return '无'
    if (typeof c === 'object') return JSON.stringify(c, null, 2)
    return String(c)
  })
</script>

<style lang="scss" scoped>
  .log-code-block {
    .lcb-label {
      margin-bottom: 4px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    .lcb-pre {
      max-height: 220px;
      padding: 10px 12px;
      margin: 0;
      overflow: auto;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: var(--art-text-gray-800);
      white-space: pre-wrap;
      word-break: break-all;
      background: var(--art-gray-100);
      border: 1px solid var(--art-border-color);
      border-radius: 8px;

      code {
        font-family: inherit;
      }
    }
  }
</style>
