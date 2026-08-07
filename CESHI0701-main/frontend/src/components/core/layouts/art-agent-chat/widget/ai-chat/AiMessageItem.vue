<!-- AG-UI 单条消息：用户右侧气泡 / 智能体左侧流式正文，窄侧栏优化 -->
<template>
  <div class="ai-message" :class="`is-${message.role}`">
    <!-- 智能体头像 -->
    <div v-if="message.role === 'assistant'" class="avatar">
      <i class="iconfont-sys">&#xe816;</i>
    </div>

    <div class="msg-main">
      <!-- 智能体名称 -->
      <div v-if="message.role === 'assistant'" class="agent-name">{{ agentName }}</div>

      <!-- 用户消息：主色浅气泡 -->
      <div v-if="message.role === 'user'" class="user-bubble">
        <div class="bubble-text">{{ message.content }}</div>
      </div>

      <!-- 智能体消息：弱背景正文 + Markdown -->
      <template v-else>
        <div
          v-if="displayText"
          v-highlight
          class="agent-content markdown"
          v-html="renderedContent"
        ></div>
        <!-- 流式光标 -->
        <span v-if="message.streaming" class="stream-cursor"></span>

        <!-- 结构化块：表格 / 图表 / 代码 / 错误 -->
        <AgentMessageRenderer v-if="hasBlocks" :blocks="message.blocks!" />
        <!-- 正在生成结构化数据（围栏未闭合） -->
        <div v-else-if="message.blocksPending" class="blocks-pending">
          <i class="loading-dot"></i>正在生成图表…
        </div>

        <!-- 关联工具调用卡片（界面偏好可关闭） -->
        <template v-if="showToolCalls">
          <AiToolCallCard v-for="tc in tools" :key="tc.id" :tool="tc" />
        </template>
      </template>

      <!-- 操作条 -->
      <div class="msg-ops">
        <button v-if="canCopy" class="op-btn" type="button" @click="onCopy">
          <i class="iconfont-sys">&#xe7b2;</i>复制
        </button>
        <button
          v-if="message.role === 'assistant' && !message.streaming"
          class="op-btn"
          type="button"
          @click="emit('regenerate')"
        >
          <i class="iconfont-sys">&#xe6d1;</i>重新生成
        </button>
        <button
          v-if="message.role === 'user' && message.sendStatus === 'failed'"
          class="op-btn is-danger"
          type="button"
          @click="emit('resend')"
        >
          发送失败，重发
        </button>
      </div>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { renderMarkdown } from '@/utils/markdown/renderMarkdown'
  import AiToolCallCard from './AiToolCallCard.vue'
  import AgentMessageRenderer from './AgentMessageRenderer.vue'
  import type { AiChatMessage, AiToolCall } from '@/types/aiChat'

  defineOptions({ name: 'AiMessageItem' })

  const props = defineProps<{
    /** 消息 */
    message: AiChatMessage
    /** 关联工具调用 */
    tools: AiToolCall[]
    /** 智能体名称 */
    agentName: string
    /** 是否显示工具调用卡片（界面偏好） */
    showToolCalls?: boolean
  }>()

  const emit = defineEmits<{
    /** 重新生成 */
    regenerate: []
    /** 重发用户消息 */
    resend: []
  }>()

  /** 展示文本：优先用解析出的纯文本（去 agent-blocks 围栏），回退原始 content */
  const displayText = computed(() => props.message.displayText ?? props.message.content)

  /** 安全渲染的 Markdown（已转义+白名单） */
  const renderedContent = computed(() => renderMarkdown(displayText.value))

  /** 是否有结构化块 */
  const hasBlocks = computed(() => !!props.message.blocks?.length)

  /** 是否可复制（有内容且非流式中） */
  const canCopy = computed(() => !!props.message.content && !props.message.streaming)

  /** 复制正文 */
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.message.content)
      ElMessage.success('已复制')
    } catch {
      ElMessage.error('复制失败')
    }
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .ai-message {
    display: flex;
    gap: 8px;
    // 消息间距由界面偏好（密度）注入的 CSS 变量控制，缺省回退 16px
    margin-bottom: var(--chat-msg-gap, 16px);

    // 用户消息整体靠右
    &.is-user {
      flex-direction: row-reverse;

      .msg-main {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        max-width: 85%;
      }

      .msg-ops {
        justify-content: flex-end;
      }
    }

    &.is-assistant .msg-main {
      min-width: 0;
      flex: 1;
    }

    .avatar {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      color: #fff;
      background: rgb(var(--art-primary));
      border-radius: 8px;

      i {
        font-size: 15px;
      }
    }

    .agent-name {
      margin-bottom: 4px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    // 用户气泡：主色浅背景
    .user-bubble {
      padding: 8px 12px;
      background: rgba(var(--art-primary), 0.1);
      border-radius: 10px 10px 2px 10px;

      .bubble-text {
        font-size: var(--chat-font-size, 14px); // 字号由界面偏好注入
        line-height: 1.6;
        color: var(--art-text-gray-900);
        word-break: break-word;
        white-space: pre-wrap;
      }
    }

    // 智能体正文：弱背景，不用厚重白卡
    .agent-content {
      font-size: var(--chat-font-size, 14px); // 字号由界面偏好注入
      line-height: 1.7;
      color: var(--art-text-gray-800);
      word-break: break-word;
    }

    // 流式光标
    .stream-cursor {
      display: inline-block;
      width: 7px;
      height: 14px;
      margin-left: 2px;
      vertical-align: text-bottom;
      background: rgb(var(--art-primary));
      animation: cursor-blink 1s step-end infinite;
    }

    // 操作条
    .msg-ops {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 6px;

      .op-btn {
        display: inline-flex;
        gap: 3px;
        align-items: center;
        padding: 0;
        font-size: 12px;
        color: var(--art-text-gray-500);
        cursor: pointer;
        background: transparent;
        border: none;

        &:hover {
          color: rgb(var(--art-primary));
        }

        &.is-danger {
          color: rgb(var(--art-danger));
        }

        i {
          font-size: 13px;
        }
      }
    }

    // 窄侧栏 Markdown 优化：表格/代码块横向滚动，长链接换行，正文不撑破面板
    .agent-content.markdown {
      :deep(h1),
      :deep(h2),
      :deep(h3) {
        margin: 10px 0 6px;
        font-size: 15px;
        font-weight: 600;
      }

      :deep(p) {
        margin: 6px 0;
      }

      :deep(ul),
      :deep(ol) {
        padding-left: 20px;
        margin: 6px 0;
      }

      :deep(blockquote) {
        padding-left: 10px;
        margin: 6px 0;
        color: var(--art-text-gray-600);
        border-left: 3px solid var(--art-border-color);
      }

      :deep(a) {
        color: rgb(var(--art-primary));
        word-break: break-all; // 长链接换行，避免撑破
      }

      :deep(code) {
        padding: 1px 5px;
        font-size: 12px;
        background: var(--art-gray-100);
        border-radius: 4px;
      }

      :deep(pre) {
        max-width: 100%;
        margin: 8px 0;
        overflow-x: auto; // 代码块横向滚动
        background: var(--art-gray-100);
        border-radius: 8px;

        code {
          display: block;
          padding: 10px;
          background: transparent;
          white-space: pre; // 保留格式，配合横向滚动
        }
      }

      // 表格：设为块级并横向滚动，避免撑破窄侧栏
      :deep(table.md-table),
      :deep(table) {
        display: block;
        max-width: 100%;
        overflow-x: auto;
        border-collapse: collapse;
        font-size: 12px;

        th,
        td {
          padding: 4px 8px;
          border: 1px solid var(--art-border-color);
          white-space: nowrap;
        }
      }
    }
  }

  @keyframes cursor-blink {
    50% {
      opacity: 0;
    }
  }

  // 结构化数据生成中占位
  .blocks-pending {
    display: flex;
    gap: 6px;
    align-items: center;
    margin: 8px 0;
    font-size: 13px;
    color: var(--art-text-gray-500);

    .loading-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: rgb(var(--art-primary));
      border-radius: 50%;
      animation: cursor-blink 1s step-end infinite;
    }
  }
</style>
