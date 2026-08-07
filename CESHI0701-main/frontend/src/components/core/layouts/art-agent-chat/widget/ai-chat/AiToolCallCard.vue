<!-- AG-UI 工具调用卡片：可折叠，展示名称/状态/参数摘要/结果摘要/耗时 -->
<template>
  <div class="tool-call-card" :class="`is-${tool.status}`">
    <button class="tc-head" type="button" @click="expanded = !expanded">
      <i class="iconfont-sys tc-caret" :class="{ open: expanded }">&#xe6df;</i>
      <span class="tc-name">{{ tool.name }}</span>
      <span class="tc-status">{{ statusText }}</span>
      <span v-if="duration" class="tc-duration">{{ duration }}</span>
    </button>

    <div v-show="expanded" class="tc-body">
      <div class="tc-section">
        <div class="tc-label">调用参数</div>
        <pre class="tc-pre">{{ prettyArgs }}</pre>
      </div>
      <div v-if="tool.result !== undefined" class="tc-section">
        <div class="tc-label">执行结果</div>
        <pre class="tc-pre">{{ prettyResult }}</pre>
      </div>
      <div v-if="tool.error" class="tc-section">
        <div class="tc-label tc-error-label">错误</div>
        <div class="tc-error">{{ tool.error }}</div>
      </div>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { AiToolCall } from '@/types/aiChat'

  defineOptions({ name: 'AiToolCallCard' })

  const props = defineProps<{ tool: AiToolCall }>()

  /** 默认折叠详情，避免占满窄侧栏 */
  const expanded = ref(false)

  /** 状态中文文案 */
  const statusText = computed(() => {
    const map: Record<AiToolCall['status'], string> = {
      preparing: '准备调用',
      'args-streaming': '参数生成中',
      'awaiting-confirmation': '等待确认',
      executing: '执行中',
      success: '执行成功',
      error: '执行失败',
      cancelled: '已取消'
    }
    return map[props.tool.status]
  })

  /** 执行耗时（成功/失败且有结束时间时显示） */
  const duration = computed(() => {
    if (!props.tool.finishedAt) return ''
    const ms = props.tool.finishedAt - props.tool.startedAt
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  })

  /** 参数美化（尽量解析 JSON，失败则原样） */
  const prettyArgs = computed(() => formatMaybeJson(props.tool.argsText || ''))
  /** 结果美化 */
  const prettyResult = computed(() => formatMaybeJson(props.tool.result || ''))

  /** 尝试格式化 JSON 字符串，失败返回原文 */
  function formatMaybeJson(text: string): string {
    if (!text) return '(无)'
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .tool-call-card {
    margin: 6px 0;
    overflow: hidden;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 8px;

    .tc-head {
      display: flex;
      gap: 6px;
      align-items: center;
      width: 100%;
      padding: 8px 10px;
      font-size: 12px;
      cursor: pointer;
      background: transparent;
      border: none;

      .tc-caret {
        font-size: 12px;
        color: var(--art-text-gray-500);
        transition: transform 0.2s;

        &.open {
          transform: rotate(90deg);
        }
      }

      .tc-name {
        font-weight: 600;
        color: var(--art-text-gray-800);
      }

      .tc-status {
        padding: 1px 6px;
        font-size: 11px;
        color: var(--art-text-gray-600);
        background: var(--art-gray-100);
        border-radius: 4px;
      }

      .tc-duration {
        margin-left: auto;
        color: var(--art-text-gray-500);
      }
    }

    // 状态色：执行中主色，成功绿色，失败红色
    &.is-executing .tc-status,
    &.is-args-streaming .tc-status {
      color: rgb(var(--art-primary));
      background: rgba(var(--art-primary), 0.1);
    }

    &.is-success .tc-status {
      color: rgb(var(--art-success));
      background: rgba(var(--art-success), 0.12);
    }

    &.is-error .tc-status {
      color: rgb(var(--art-danger));
      background: rgba(var(--art-danger), 0.12);
    }

    .tc-body {
      padding: 0 10px 10px;

      .tc-section {
        margin-top: 8px;

        .tc-label {
          margin-bottom: 4px;
          font-size: 11px;
          color: var(--art-text-gray-500);

          &.tc-error-label {
            color: rgb(var(--art-danger));
          }
        }

        .tc-pre {
          max-height: 200px;
          margin: 0;
          overflow: auto; // 窄栏下允许横向/纵向滚动，不撑破面板
          font-size: 12px;
          line-height: 1.5;
          white-space: pre;
          background: var(--art-gray-100);
          border-radius: 6px;
          padding: 8px;
        }

        .tc-error {
          font-size: 12px;
          color: rgb(var(--art-danger));
          word-break: break-word;
        }
      }
    }
  }
</style>
