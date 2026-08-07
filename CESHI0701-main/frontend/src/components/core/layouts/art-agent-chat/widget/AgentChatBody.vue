<!--
  对话主体：消息列表 + 输入框组合。供停靠态 / 悬浮态共用，避免两处重复拼装。
  自身不实例化 agent（D10），通过 props 接收顶层单实例。
-->
<template>
  <div class="agent-chat-body">
    <AiMessageList :agent-name="agentName" @retry="agent.retry" />

    <!-- 高风险操作确认卡片：固定在输入框正上方，出现即可见，无需下翻查找 -->
    <div class="docked-confirm">
      <AgentConfirmationCard />
    </div>

    <AgentChatInput
      v-model="draft"
      :model-groups="modelStore.availableModelGroups"
      :selection="modelStore.currentSelection"
      :has-model="modelStore.hasAvailableModel"
      :is-generating="chatStore.isRunning"
      :allow-attachment="false"
      @select-model="modelStore.selectModel"
      @open-config="emit('open-config')"
      @send="agent.send"
      @stop="agent.stop"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useAiChatStore } from '@/store/modules/aiChat'
  import { useModelConfigStore } from '@/store/modules/modelConfig'
  import type { useAgUiAgent } from '../composables/useAgUiAgent'
  import AiMessageList from './ai-chat/AiMessageList.vue'
  import AgentChatInput from './AgentChatInput.vue'
  import AgentConfirmationCard from './ai-chat/AgentConfirmationCard.vue'

  defineOptions({ name: 'AgentChatBody' })

  const props = defineProps<{
    /** 智能体名称 */
    agentName: string
    /** 顶层单实例 agent（D10） */
    agent: ReturnType<typeof useAgUiAgent>
  }>()

  const emit = defineEmits<{
    /** 打开模型配置弹窗 */
    'open-config': []
  }>()

  const agent = props.agent
  const chatStore = useAiChatStore()
  const modelStore = useModelConfigStore()

  /** 草稿双向绑定到对话 store（三模式共享同一草稿源） */
  const draft = computed({
    get: () => chatStore.draftInput,
    set: (v) => chatStore.setDraft(v)
  })
</script>

<style lang="scss" scoped>
  .agent-chat-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  // 确认卡片固定在输入框上方（不随消息滚动），加左右外边距与输入区对齐
  .docked-confirm {
    flex-shrink: 0;
    margin: 0 16px;
  }
</style>
