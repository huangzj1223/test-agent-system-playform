<!-- Markdown 渲染器：复用零依赖安全渲染器 + 高亮指令，窄栏样式在 AiMessageItem 统一定义 -->
<template>
  <div v-highlight class="markdown-body markdown" v-html="html"></div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { renderMarkdown } from '@/utils/markdown/renderMarkdown'

  defineOptions({ name: 'MarkdownRenderer' })

  const props = defineProps<{
    /** Markdown 源文本 */
    content: string
  }>()

  /** 安全渲染的 HTML（已 HTML 转义 + 白名单，防 XSS） */
  const html = computed(() => renderMarkdown(props.content))
</script>
