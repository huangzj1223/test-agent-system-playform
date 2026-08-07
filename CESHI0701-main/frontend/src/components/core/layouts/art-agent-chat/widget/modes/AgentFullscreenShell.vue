<!--
  全屏态外壳：fixed 覆盖层工作台。
  - 空态（无消息）：徽标 + 大标题 + 上下文卡片 + 大输入框 + 快捷操作。
  - 有消息：居中消息列表 + 沉底输入框。
  切换只改 store.mode，不碰会话；退出全屏回到进入前的模式。
-->
<template>
  <div class="agent-fullscreen">
    <!-- 精简顶栏 -->
    <header class="fs-topbar">
      <div class="fs-brand">
        <span class="brand-logo"><i class="iconfont-sys">&#xe6c5;</i></span>
        <span class="brand-name">{{ agentName }}</span>
      </div>
      <div class="fs-actions">
        <ElTooltip content="历史会话" placement="bottom">
          <button class="fs-btn" type="button" aria-label="历史会话" @click="emit('open-history')">
            <i class="iconfont-sys">&#xe764;</i>
          </button>
        </ElTooltip>
        <ElTooltip content="新建会话" placement="bottom">
          <button class="fs-btn" type="button" aria-label="新建会话" @click="agent.newChat">
            <i class="iconfont-sys">&#xe602;</i>
          </button>
        </ElTooltip>
        <ElTooltip content="设置" placement="bottom">
          <button class="fs-btn" type="button" aria-label="设置" @click="emit('open-config')">
            <i class="iconfont-sys">&#xe6d0;</i>
          </button>
        </ElTooltip>
        <ElTooltip content="退出全屏" placement="bottom">
          <button class="fs-btn" type="button" aria-label="退出全屏" @click="mode.exitFullscreen">
            <i class="iconfont-sys">&#xe62d;</i>
          </button>
        </ElTooltip>
      </div>
    </header>

    <!-- 有消息：居中消息列表 + 沉底输入 -->
    <div v-if="hasMessages" class="fs-conversation">
      <div class="fs-conv-inner">
        <AgentChatBody :agent-name="agentName" :agent="agent" @open-config="emit('open-config')" />
      </div>
    </div>

    <!-- 空态：工作台首屏 -->
    <div v-else class="fs-workspace">
      <div class="ws-inner">
        <div class="ws-badge"><i class="iconfont-sys">&#xe6df;</i> 你的智能工作助手</div>
        <h1 class="ws-title">今天想让<span class="hl">智能体</span>帮你做什么？</h1>
        <p class="ws-subtitle">基于当前业务上下文，为你提供专业的分析与操作建议</p>

        <AgentContextCard class="ws-context" />

        <div class="ws-input">
          <AgentChatInput
            v-model="draft"
            size="large"
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

        <AgentQuickActions class="ws-quick" @pick="onPickQuick" />

        <p class="ws-safe"><i class="iconfont-sys">&#xe763;</i> 你的对话内容将被安全处理，请放心使用</p>
      </div>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { computed } from 'vue'
  import { ElTooltip } from 'element-plus'
  import { useAiChatStore } from '@/store/modules/aiChat'
  import { useModelConfigStore } from '@/store/modules/modelConfig'
  import type { useAgUiAgent } from '../../composables/useAgUiAgent'
  import type { useAgentMode } from '../../composables/useAgentMode'
  import AgentChatBody from '../AgentChatBody.vue'
  import AgentChatInput from '../AgentChatInput.vue'
  import AgentContextCard from '../fullscreen/AgentContextCard.vue'
  import AgentQuickActions from '../fullscreen/AgentQuickActions.vue'

  defineOptions({ name: 'AgentFullscreenShell' })

  const props = defineProps<{
    /** 智能体名称 */
    agentName: string
    /** 顶层单实例 agent（D10） */
    agent: ReturnType<typeof useAgUiAgent>
    /** 顶层单实例模式编排（提供 exitFullscreen） */
    mode: ReturnType<typeof useAgentMode>
  }>()

  const emit = defineEmits<{
    'open-config': []
    'open-history': []
  }>()

  const agent = props.agent
  const chatStore = useAiChatStore()
  const modelStore = useModelConfigStore()

  /** 是否已有消息（决定工作台首屏 or 对话视图） */
  const hasMessages = computed(() => chatStore.messages.length > 0)

  /** 草稿双向绑定（与其它模式共享同一草稿源） */
  const draft = computed({
    get: () => chatStore.draftInput,
    set: (v) => chatStore.setDraft(v)
  })

  /** 点击快捷操作：填入输入框，聚焦交给用户确认后发送 */
  const onPickQuick = (prompt: string) => {
    chatStore.setDraft(prompt)
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  @use '../../style';

  .agent-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 385;
    display: flex;
    flex-direction: column;
    background: var(--art-bg-color, var(--art-main-bg-color));
  }

  // 顶栏
  .fs-topbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 20px;
    border-bottom: 1px solid var(--art-border-color);

    .fs-brand {
      display: flex;
      gap: 8px;
      align-items: center;

      .brand-logo {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        color: #fff;
        background: var(--art-primary);
        border-radius: 8px;
      }

      .brand-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--art-text-gray-900);
      }
    }

    .fs-actions {
      display: flex;
      gap: 4px;
      align-items: center;

      .fs-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        color: var(--art-text-gray-600);
        cursor: pointer;
        background: transparent;
        border: none;
        border-radius: 8px;
        transition: all 0.2s;

        &:hover {
          color: var(--art-primary);
          background: var(--art-gray-100);
        }

        i {
          font-size: 18px;
        }
      }
    }
  }

  // 对话视图（有消息）
  .fs-conversation {
    flex: 1;
    min-height: 0;

    .fs-conv-inner {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 860px;
      height: 100%;
      margin: 0 auto;
    }
  }

  // 工作台首屏（空态）
  .fs-workspace {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    .ws-inner {
      display: flex;
      flex-direction: column;
      gap: 18px;
      align-items: center;
      width: 100%;
      max-width: 760px;
      padding: 48px 24px 40px;
      margin: 0 auto;
    }

    .ws-badge {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 6px 14px;
      font-size: 13px;
      color: var(--art-primary);
      background: var(--art-primary-light-9, var(--art-gray-100));
      border-radius: 999px;
    }

    .ws-title {
      margin: 4px 0 0;
      font-size: 34px;
      font-weight: 700;
      color: var(--art-text-gray-900);
      text-align: center;

      .hl {
        color: var(--art-primary);
      }
    }

    .ws-subtitle {
      margin: 0;
      font-size: 15px;
      color: var(--art-text-gray-500);
      text-align: center;
    }

    .ws-context {
      margin-top: 8px;
    }

    .ws-input {
      width: 100%;
      padding: 8px 16px 4px;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 14px;
      box-shadow: var(--art-box-shadow-sm, 0 4px 16px rgb(0 0 0 / 6%));
    }

    .ws-quick {
      margin-top: 6px;
    }

    .ws-safe {
      display: flex;
      gap: 6px;
      align-items: center;
      margin: 12px 0 0;
      font-size: 12px;
      color: var(--art-text-gray-400);
    }
  }
</style>
