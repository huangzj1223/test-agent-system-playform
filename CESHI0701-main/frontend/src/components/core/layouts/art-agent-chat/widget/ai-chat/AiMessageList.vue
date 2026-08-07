<!-- AG-UI 消息区：消息列表 + 步骤/推理/错误 + 回到底部，独立滚动 -->
<template>
  <div class="ai-message-list-wrap">
    <div ref="scrollRef" class="ai-message-scroll" :style="prefStyle">
      <!-- 空态：欢迎页（无消息 && 非生成中时展示，属 UI 空状态不写入消息数组） -->
      <AgentWelcome
        v-if="showWelcome"
        :agent-name="agentName"
        @prompt-click="onPromptClick"
      />

      <!-- 消息列表 -->
      <AiMessageItem
        v-for="msg in store.messages"
        :key="msg.id"
        :message="msg"
        :tools="toolsOf(msg.id)"
        :agent-name="agentName"
        :show-tool-calls="uiPrefs.showToolCalls"
        @regenerate="emit('retry')"
        @resend="emit('retry')"
      />

      <!-- 当前轮次的推理过程（默认折叠，界面偏好可关闭） -->
      <template v-if="uiPrefs.showReasoning">
        <AiReasoningBlock v-for="rb in store.reasoning" :key="rb.id" :block="rb" />
      </template>

      <!-- 执行步骤（仅有真实步骤事件时显示） -->
      <AiRunSteps :steps="store.steps" />

      <!-- 错误卡片 -->
      <AiErrorCard
        v-if="store.status === 'error' && store.error"
        :error="store.error"
        @retry="emit('retry')"
      />
    </div>

    <!-- 回到底部 -->
    <button
      v-show="showBackToBottom"
      class="back-to-bottom"
      type="button"
      @click="scrollToBottom(true)"
    >
      <i class="iconfont-sys">&#xe712;</i>
    </button>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useAiChatStore } from '@/store/modules/aiChat'
  import { useAgentChatSettingStore } from '@/store/modules/agentChatSetting'
  import { useChatAutoScroll } from '../../composables/useChatAutoScroll'
  import AiMessageItem from './AiMessageItem.vue'
  import AiReasoningBlock from './AiReasoningBlock.vue'
  import AiRunSteps from './AiRunSteps.vue'
  import AiErrorCard from './AiErrorCard.vue'
  import AgentWelcome from '../AgentWelcome.vue'

  defineOptions({ name: 'AiMessageList' })

  defineProps<{ agentName: string }>()
  const emit = defineEmits<{ retry: [] }>()

  const store = useAiChatStore()

  /** 欢迎页显示条件：会话无消息 && 当前没有正在生成的消息 */
  const showWelcome = computed(() => !store.messages.length && !store.isRunning)

  /** 快捷卡片点击：把示例文本回填到输入框草稿（用户确认后再发送） */
  const onPromptClick = (text: string) => store.setDraft(text)
  const { uiPrefs } = storeToRefs(useAgentChatSettingStore())
  const scrollRef = ref<HTMLElement>()
  const { showBackToBottom, scrollToBottom, onContentGrow } = useChatAutoScroll(scrollRef)

  /** 字号偏好 → 正文基准字号（px） */
  const FONT_SIZE_MAP: Record<string, string> = { small: '13px', medium: '14px', large: '16px' }
  /** 密度偏好 → 消息间距（px） */
  const DENSITY_GAP_MAP: Record<string, string> = { compact: '8px', comfortable: '16px' }

  /** 注入 CSS 变量：子组件（AiMessageItem 等）scoped 样式读取以应用字号/密度 */
  const prefStyle = computed(() => ({
    '--chat-font-size': FONT_SIZE_MAP[uiPrefs.value.fontSize] || FONT_SIZE_MAP.medium,
    '--chat-msg-gap': DENSITY_GAP_MAP[uiPrefs.value.density] || DENSITY_GAP_MAP.comfortable
  }))

  /** 取某条消息关联的工具调用 */
  const toolsOf = (messageId: string) => store.getToolCallsForMessage(messageId)

  // 内容变化（新消息 / 流式增长 / 步骤更新）时按跟随态滚动
  watch(
    () => [
      store.messages.length,
      store.messages[store.messages.length - 1]?.content,
      store.steps.length,
      store.status
    ],
    () => onContentGrow(),
    { flush: 'post' }
  )
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .ai-message-list-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .ai-message-scroll {
    height: 100%;
    padding: 16px;
    overflow-x: hidden; // 禁止 Markdown 内容触发横向滚动
    overflow-y: auto;
  }

  .back-to-bottom {
    position: absolute;
    right: 16px;
    bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    color: var(--art-text-gray-600);
    cursor: pointer;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 50%;
    box-shadow: var(--art-box-shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.08));

    &:hover {
      color: rgb(var(--art-primary));
    }

    i {
      font-size: 15px;
    }
  }
</style>
