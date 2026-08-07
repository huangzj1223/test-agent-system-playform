<!--
  悬浮态外壳：fixed 非模态窗口，可拖动（标题栏）、可 8 向缩放。
  几何与拖动/缩放处理器来自顶层单实例 useAgentMode（经 props 下发，不在此重复创建）。
  小屏降级为抽屉（由 index.vue 按 isMobile 改用停靠外壳，见 C4）。
-->
<template>
  <div class="agent-floating-window" :style="mode.floatingStyle.value">
    <!-- 拖动抓握条（顶部）：作为拖动手柄，避免与头部按钮冲突 -->
    <div class="drag-grip" @pointerdown="mode.onDragStart">
      <span class="grip-dot"></span>
      <span class="grip-dot"></span>
    </div>

    <AgentHeader
      :agent-name="agentName"
      :mode="'floating'"
      @set-mode="(m) => emit('set-mode', m)"
      @config="emit('open-config')"
      @history="emit('open-history')"
      @new-chat="agent.newChat"
      @close="emit('close')"
    />

    <AgentChatBody :agent-name="agentName" :agent="agent" @open-config="emit('open-config')" />

    <!-- 8 向缩放手柄 -->
    <div
      v-for="dir in RESIZE_DIRS"
      :key="dir"
      class="resize-handle"
      :class="`dir-${dir}`"
      @pointerdown="(e) => mode.onResizeStart(dir, e)"
    ></div>
  </div>
</template>

<script setup lang="ts">
  import type { AgentMode } from '@/store/modules/agentChat'
  import type { useAgUiAgent } from '../../composables/useAgUiAgent'
  import type { useAgentMode, ResizeDir } from '../../composables/useAgentMode'
  import AgentHeader from '../AgentHeader.vue'
  import AgentChatBody from '../AgentChatBody.vue'

  defineOptions({ name: 'AgentFloatingShell' })

  const props = defineProps<{
    /** 智能体名称 */
    agentName: string
    /** 顶层单实例 agent（D10） */
    agent: ReturnType<typeof useAgUiAgent>
    /** 顶层单实例模式编排（提供几何与拖动/缩放处理器） */
    mode: ReturnType<typeof useAgentMode>
  }>()

  const emit = defineEmits<{
    'open-config': []
    'open-history': []
    close: []
    'set-mode': [mode: AgentMode]
  }>()

  const agent = props.agent

  /** 8 向缩放方向 */
  const RESIZE_DIRS: ResizeDir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
</script>

<style lang="scss" scoped>
  @use '../../style';

  .agent-floating-window {
    position: fixed;
    z-index: 390;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 12px;
    box-shadow: var(--art-box-shadow-lg, 0 12px 32px rgb(0 0 0 / 18%));
  }

  // 顶部拖动抓握条：两点视觉 + ew/move 光标
  .drag-grip {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    align-items: center;
    justify-content: center;
    height: 14px;
    cursor: move;
    touch-action: none;

    .grip-dot {
      width: 4px;
      height: 4px;
      background: var(--art-text-gray-400);
      border-radius: 50%;
    }

    &:hover .grip-dot {
      background: var(--art-primary);
    }
  }

  // 缩放手柄：四边窄条 + 四角小块
  .resize-handle {
    position: absolute;
    z-index: 2;
    touch-action: none;

    &.dir-n {
      top: -3px;
      left: 8px;
      right: 8px;
      height: 6px;
      cursor: ns-resize;
    }
    &.dir-s {
      bottom: -3px;
      left: 8px;
      right: 8px;
      height: 6px;
      cursor: ns-resize;
    }
    &.dir-e {
      top: 8px;
      right: -3px;
      bottom: 8px;
      width: 6px;
      cursor: ew-resize;
    }
    &.dir-w {
      top: 8px;
      left: -3px;
      bottom: 8px;
      width: 6px;
      cursor: ew-resize;
    }
    &.dir-ne {
      top: -3px;
      right: -3px;
      width: 12px;
      height: 12px;
      cursor: nesw-resize;
    }
    &.dir-nw {
      top: -3px;
      left: -3px;
      width: 12px;
      height: 12px;
      cursor: nwse-resize;
    }
    &.dir-se {
      right: -3px;
      bottom: -3px;
      width: 12px;
      height: 12px;
      cursor: nwse-resize;
    }
    &.dir-sw {
      left: -3px;
      bottom: -3px;
      width: 12px;
      height: 12px;
      cursor: nesw-resize;
    }
  }
</style>
