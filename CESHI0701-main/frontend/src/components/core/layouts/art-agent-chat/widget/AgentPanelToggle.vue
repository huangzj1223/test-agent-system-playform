<!-- 面板折叠/展开控制按钮：展开态显向右收起，收起态显向左展开 -->
<template>
  <button
    class="agent-panel-toggle"
    :class="[`is-${placement}`, { 'is-open': open }]"
    type="button"
    :title="open ? '向右收起' : '向左展开'"
    :aria-label="open ? '向右收起对话框' : '向左展开对话框'"
    @click="emit('toggle')"
  >
    <!-- 展开时向右收起图标(you2 e723)，收起时向左展开图标(zuo2 e71d) -->
    <i class="iconfont-sys" v-html="open ? '&#xe723;' : '&#xe71d;'"></i>
  </button>
</template>

<script setup lang="ts">
  defineOptions({ name: 'AgentPanelToggle' })

  defineProps<{
    /** 当前是否展开 */
    open: boolean
    /** 按钮位置：edge 贴面板左边缘；handle 收起后浮在页面右缘 */
    placement: 'edge' | 'handle'
  }>()

  const emit = defineEmits<{
    toggle: []
  }>()
</script>

<style lang="scss" scoped>
  .agent-panel-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 48px;
    padding: 0;
    color: var(--art-text-gray-600);
    cursor: pointer;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 8px 0 0 8px;
    transition: color 0.2s;

    &:hover {
      color: var(--art-primary);
    }

    i {
      font-size: 14px;
    }

    // 贴面板左边缘
    &.is-edge {
      position: absolute;
      top: 50%;
      left: -24px;
      z-index: 2;
      transform: translateY(-50%);
    }

    // 收起后浮在页面右缘的展开手柄
    &.is-handle {
      position: fixed;
      top: 50%;
      right: 0;
      z-index: 380;
      box-shadow: var(--art-box-shadow-sm);
      transform: translateY(-50%);
    }
  }
</style>
