/**
 * 智能体对话侧边栏 Store
 * 聚合展示模式、整体可见态、停靠宽度、悬浮位置尺寸、消息、输入、生成状态、会话与附件。
 * 仅持久化用户偏好与草稿（可见态/模式/草稿/停靠宽度/悬浮位置尺寸），消息与会话为运行时状态。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AgentMessage, AgentAttachment, AgentConversation } from '@/types/agent'

/** 智能体展示模式 */
export type AgentMode = 'docked' | 'floating' | 'fullscreen'

/** 停靠态宽度约束：最小 320，最大动态取视口 50%，默认 420 */
const PANEL_WIDTH_MIN = 320
const PANEL_WIDTH_DEFAULT = 420
/** 停靠宽度上限兜底（SSR/无 window 时用），运行时以视口 50% 为准 */
const PANEL_WIDTH_MAX_FALLBACK = 720
/** 悬浮窗最小尺寸兜底 */
const FLOATING_MIN_WIDTH = 360
const FLOATING_MIN_HEIGHT = 480
/** 悬浮窗默认尺寸与位置 */
const FLOATING_DEFAULT_SIZE = { width: 420, height: 640 }
const FLOATING_DEFAULT_POSITION = { x: 120, y: 100 }
/** 默认智能体名称 */
const DEFAULT_AGENT_NAME = '问候开场'

/** 计算停靠宽度上限：视口 50%，无 window 时用兜底 */
const panelWidthMax = (): number =>
  typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.5) : PANEL_WIDTH_MAX_FALLBACK

export const useAgentChatStore = defineStore(
  'agentChatStore',
  () => {
    // ==================== 持久化状态 ====================
    /** 智能体整体是否可见（关闭=完全隐藏，右缘留展开手柄）。取代旧 isPanelOpen 语义 */
    const agentVisible = ref(true)
    /** 当前展示模式：停靠/悬浮/全屏 */
    const mode = ref<AgentMode>('docked')
    /** 未发送的草稿输入 */
    const draftInput = ref('')
    /** 停靠面板宽度（=dockedWidth） */
    const panelWidth = ref(PANEL_WIDTH_DEFAULT)
    /** 悬浮窗位置（左上角坐标） */
    const floatingPosition = ref({ ...FLOATING_DEFAULT_POSITION })
    /** 悬浮窗尺寸 */
    const floatingSize = ref({ ...FLOATING_DEFAULT_SIZE })

    /**
     * 兼容别名：isPanelOpen 可写 computed，读写均映射 agentVisible。
     * views/index/index.vue 的 agentPanelSpace 让位计算仍读 isPanelOpen，
     * 保留此别名可使框架二让位逻辑零改动、不回归。
     */
    const isPanelOpen = computed({
      get: () => agentVisible.value,
      set: (v: boolean) => {
        agentVisible.value = v
      }
    })

    // ==================== 运行时状态 ====================
    /** 当前会话消息列表 */
    const messages = ref<AgentMessage[]>([])
    /** 是否正在生成回复 */
    const isGenerating = ref(false)
    /** 当前会话 ID */
    const currentConversationId = ref<string | null>(null)
    /** 待发送附件 */
    const attachments = ref<AgentAttachment[]>([])
    /** 历史会话列表 */
    const conversationList = ref<AgentConversation[]>([])
    /** 当前智能体名称 */
    const agentName = ref(DEFAULT_AGENT_NAME)
    /** 是否处于移动端断点（运行时，由面板监听窗口尺寸更新，供布局共享） */
    const isMobile = ref(false)

    // ==================== Actions ====================
    /** 切换整体可见（保留旧名，内部写 agentVisible） */
    const togglePanel = () => {
      agentVisible.value = !agentVisible.value
    }

    /** 设置整体可见态（保留旧名，内部写 agentVisible） */
    const setPanelOpen = (open: boolean) => {
      agentVisible.value = open
    }

    /** 切换整体可见（语义化新名，等价 togglePanel） */
    const toggleVisible = () => {
      agentVisible.value = !agentVisible.value
    }

    /** 设置展示模式 */
    const setMode = (m: AgentMode) => {
      mode.value = m
    }

    /** 设置草稿输入 */
    const setDraft = (text: string) => {
      draftInput.value = text
    }

    /** 设置停靠面板宽度（夹取到 [320, 视口50%]） */
    const setPanelWidth = (width: number) => {
      panelWidth.value = Math.min(panelWidthMax(), Math.max(PANEL_WIDTH_MIN, Math.round(width)))
    }

    /** 设置悬浮窗位置（夹取由调用方/composable 处理，这里只落库） */
    const setFloatingPosition = (pos: { x: number; y: number }) => {
      floatingPosition.value = { x: Math.round(pos.x), y: Math.round(pos.y) }
    }

    /** 设置悬浮窗尺寸（不低于最小尺寸兜底） */
    const setFloatingSize = (size: { width: number; height: number }) => {
      floatingSize.value = {
        width: Math.max(FLOATING_MIN_WIDTH, Math.round(size.width)),
        height: Math.max(FLOATING_MIN_HEIGHT, Math.round(size.height))
      }
    }

    /** 追加一条消息 */
    const appendMessage = (message: AgentMessage) => {
      messages.value.push(message)
    }

    /** 向指定消息追加流式文本片段 */
    const appendChunkToMessage = (messageId: string, chunk: string) => {
      const target = messages.value.find((m) => m.id === messageId)
      if (target) target.content += chunk
    }

    /** 更新指定消息的状态 */
    const setMessageStatus = (messageId: string, status: AgentMessage['status']) => {
      const target = messages.value.find((m) => m.id === messageId)
      if (target) target.status = status
    }

    /** 清空当前会话消息 */
    const clearMessages = () => {
      messages.value = []
    }

    /** 设置生成状态 */
    const setGenerating = (value: boolean) => {
      isGenerating.value = value
    }

    /** 设置当前会话 ID */
    const setConversationId = (id: string | null) => {
      currentConversationId.value = id
    }

    /** 设置历史会话列表 */
    const setConversationList = (list: AgentConversation[]) => {
      conversationList.value = list
    }

    /** 新增待发送附件 */
    const addAttachment = (item: AgentAttachment) => {
      attachments.value.push(item)
    }

    /** 移除待发送附件 */
    const removeAttachment = (id: string) => {
      attachments.value = attachments.value.filter((a) => a.id !== id)
    }

    /** 清空待发送附件 */
    const clearAttachments = () => {
      attachments.value = []
    }

    /** 设置移动端断点状态 */
    const setMobile = (value: boolean) => {
      isMobile.value = value
    }

    return {
      isPanelOpen,
      agentVisible,
      mode,
      draftInput,
      panelWidth,
      floatingPosition,
      floatingSize,
      messages,
      isGenerating,
      currentConversationId,
      attachments,
      conversationList,
      agentName,
      isMobile,
      togglePanel,
      setPanelOpen,
      toggleVisible,
      setMode,
      setDraft,
      setPanelWidth,
      setFloatingPosition,
      setFloatingSize,
      appendMessage,
      appendChunkToMessage,
      setMessageStatus,
      clearMessages,
      setGenerating,
      setConversationId,
      setConversationList,
      addAttachment,
      removeAttachment,
      clearAttachments,
      setMobile
    }
  },
  {
    persist: {
      key: 'agentChat',
      storage: localStorage,
      // 仅持久化用户偏好与草稿，消息/会话为运行时状态不落盘。
      // 注意：持久化 agentVisible 本体而非 isPanelOpen 别名（computed 不宜落盘）。
      pick: [
        'agentVisible',
        'mode',
        'draftInput',
        'panelWidth',
        'floatingPosition',
        'floatingSize'
      ]
    }
  }
)
