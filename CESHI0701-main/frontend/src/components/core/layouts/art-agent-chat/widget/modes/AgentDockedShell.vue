<!-- 停靠态外壳：右侧第三栏，可折叠，小屏抽屉化。由原 index.vue 停靠态逻辑抽出，行为不变 -->
<template>
  <!-- 小屏遮罩：仅移动端抽屉模式且展开时显示 -->
  <div
    v-if="isMobile && panel.isPanelOpen"
    class="agent-chat-mask"
    @click="panel.setPanelOpen(false)"
  ></div>

  <aside
    class="agent-chat-panel"
    :class="{
      'is-open': panel.isPanelOpen,
      'is-mobile': isMobile,
      'is-framework-two': isFrameworkTwo && !isMobile,
      'is-dragging': isDragging
    }"
    :style="panelStyle"
  >
    <!-- 左边缘折叠按钮（展开态，非移动端） -->
    <AgentPanelToggle
      v-if="!isMobile"
      :open="panel.isPanelOpen"
      placement="edge"
      @toggle="panel.togglePanel"
    />

    <!-- 左边缘拖拽调宽手柄（展开态，非移动端）：向左拖变宽，向右拖变窄 -->
    <div
      v-if="!isMobile && panel.isPanelOpen"
      class="resize-handle"
      :class="{ 'is-dragging': isDragging }"
      title="拖动可调整面板宽度"
      role="separator"
      aria-orientation="vertical"
      aria-label="拖动可调整面板宽度"
      @pointerdown="onResizeStart"
    ></div>

    <!-- 拖拽提示气泡（拖拽中显示当前宽度） -->
    <div v-if="isDragging" class="resize-tip">{{ Math.round(liveWidth ?? panel.panelWidth) }} px</div>

    <!-- 面板主体：收起时保留 DOM 但不渲染重内容 -->
    <div v-show="panel.isPanelOpen" class="panel-body">
      <AgentHeader
        :agent-name="agentName"
        :mode="panel.mode"
        @set-mode="(m) => emit('set-mode', m)"
        @config="emit('open-config')"
        @history="emit('open-history')"
        @new-chat="agent.newChat"
        @close="panel.setPanelOpen(false)"
      />

      <AgentChatBody :agent-name="agentName" :agent="agent" @open-config="emit('open-config')" />
    </div>
  </aside>

  <!-- 收起后的展开手柄（页面右缘） -->
  <AgentPanelToggle
    v-if="!panel.isPanelOpen"
    :open="false"
    placement="handle"
    @toggle="panel.togglePanel"
  />
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { computed, ref, onBeforeUnmount } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useAgentChatStore, type AgentMode } from '@/store/modules/agentChat'
  import { useSettingStore } from '@/store/modules/setting'
  import { FrameworkTypeEnum } from '@/enums/appEnum'
  import type { useAgUiAgent } from '../../composables/useAgUiAgent'
  import AgentPanelToggle from '../AgentPanelToggle.vue'
  import AgentHeader from '../AgentHeader.vue'
  import AgentChatBody from '../AgentChatBody.vue'

  defineOptions({ name: 'AgentDockedShell' })

  const props = defineProps<{
    /** 智能体名称 */
    agentName: string
    /** 顶层单实例 agent（D10：不在此重复调用 useAgUiAgent） */
    agent: ReturnType<typeof useAgUiAgent>
  }>()

  const emit = defineEmits<{
    /** 打开模型配置弹窗 */
    'open-config': []
    /** 打开历史会话抽屉 */
    'open-history': []
    /** 切换展示模式（冒泡到 Workspace 统一处理） */
    'set-mode': [mode: AgentMode]
  }>()

  const agent = props.agent

  const panel = useAgentChatStore()
  const settingStore = useSettingStore()
  const { frameworkType } = storeToRefs(settingStore)

  /** 是否框架二（顶栏布局，面板需固定定位） */
  const isFrameworkTwo = computed(() => frameworkType.value === FrameworkTypeEnum.FRAMEWORK_TWO)
  /** 移动端断点（收敛到 store，供布局共享） */
  const isMobile = computed(() => panel.isMobile)

  // ==================== A3a 左边缘拖拽调宽 ====================
  /** 拖拽中显示的实时宽度（未拖拽为 null，读 store 值）；仅本地渲染，pointerup 才落库 */
  const liveWidth = ref<number | null>(null)
  /** 是否拖拽中 */
  const isDragging = computed(() => liveWidth.value !== null)

  let rafId = 0
  let startX = 0
  let startWidth = 0

  /** 停靠宽度上限：视口 50%（与 store 约束一致） */
  const widthMax = () => Math.round(window.innerWidth * 0.5)
  const WIDTH_MIN = 320

  /** rAF 节流写入本地实时宽度 */
  const scheduleWidth = (w: number) => {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      liveWidth.value = Math.min(widthMax(), Math.max(WIDTH_MIN, w))
    })
  }

  /** 开始拖拽：手柄在面板左边缘，向左拖（clientX 减小）应变宽，故宽度增量取负向 */
  const onResizeStart = (e: PointerEvent) => {
    e.preventDefault()
    startX = e.clientX
    startWidth = panel.panelWidth
    liveWidth.value = startWidth
    ;(e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId)
    window.addEventListener('pointermove', onResizeMove)
    window.addEventListener('pointerup', onResizeEnd)
  }

  const onResizeMove = (e: PointerEvent) => {
    scheduleWidth(startWidth - (e.clientX - startX))
  }

  const onResizeEnd = () => {
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', onResizeEnd)
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    if (liveWidth.value !== null) panel.setPanelWidth(liveWidth.value)
    liveWidth.value = null
  }

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', onResizeEnd)
    if (rafId) cancelAnimationFrame(rafId)
  })

  /** 面板宽度样式：仅大屏展开时生效，收起为 0；拖拽中用本地实时宽度 */
  const panelStyle = computed(() => {
    if (isMobile.value) return {}
    const w = liveWidth.value ?? panel.panelWidth
    return { '--agent-panel-width': `${w}px` }
  })
</script>

<style lang="scss" scoped>
  @use '../../style';

  // 拖拽调宽期间禁用宽度缓动，否则每帧 transition 会“追尾”导致不跟手
  .agent-chat-panel.is-dragging {
    transition: none;
  }

  // 左边缘拖拽调宽手柄：贴面板左边缘的窄条，hover/拖拽时高亮
  .resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 3;
    width: 5px;
    height: 100%;
    cursor: ew-resize;
    background: transparent;
    transition: background-color 0.15s;
    touch-action: none;

    &:hover,
    &.is-dragging {
      background: var(--art-primary);
      opacity: 0.6;
    }
  }

  // 拖拽提示气泡：显示实时宽度
  .resize-tip {
    position: absolute;
    top: 50%;
    left: 12px;
    z-index: 4;
    padding: 4px 10px;
    font-size: 12px;
    color: #fff;
    pointer-events: none;
    background: var(--art-primary);
    border-radius: 6px;
    box-shadow: var(--art-box-shadow-sm, 0 2px 8px rgb(0 0 0 / 12%));
    transform: translateY(-50%);
  }
</style>
