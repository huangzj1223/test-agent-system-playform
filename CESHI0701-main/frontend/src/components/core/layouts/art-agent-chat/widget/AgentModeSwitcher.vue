<!-- 模式切换器：停靠 / 悬浮 / 全屏 三态切换 + 设置 + 关闭。高亮当前模式 -->
<template>
  <div class="agent-mode-switcher">
    <!-- 三种模式切换按钮组 -->
    <div class="mode-group">
      <ElTooltip
        v-for="opt in MODE_OPTIONS"
        :key="opt.value"
        :content="opt.label"
        placement="bottom"
      >
        <button
          class="mode-btn"
          :class="{ 'is-active': mode === opt.value }"
          type="button"
          :aria-label="opt.label"
          :aria-pressed="mode === opt.value"
          @click="emit('set-mode', opt.value)"
        >
          <i class="iconfont-sys" v-html="opt.icon"></i>
        </button>
      </ElTooltip>
    </div>

    <span class="divider"></span>

    <!-- 设置 -->
    <ElTooltip content="设置" placement="bottom">
      <button class="mode-btn" type="button" aria-label="设置" @click="emit('config')">
        <i class="iconfont-sys">&#xe6d0;</i>
      </button>
    </ElTooltip>

    <!-- 关闭（隐藏智能体，右缘留展开手柄） -->
    <ElTooltip content="关闭" placement="bottom">
      <button class="mode-btn" type="button" aria-label="关闭" @click="emit('close')">
        <i class="iconfont-sys">&#xe6db;</i>
      </button>
    </ElTooltip>
  </div>
</template>

<script setup lang="ts">
  import { ElTooltip } from 'element-plus'
  import type { AgentMode } from '@/store/modules/agentChat'

  defineOptions({ name: 'AgentModeSwitcher' })

  defineProps<{
    /** 当前展示模式 */
    mode: AgentMode
  }>()

  const emit = defineEmits<{
    /** 切换到某模式 */
    'set-mode': [mode: AgentMode]
    /** 打开设置 */
    config: []
    /** 关闭智能体 */
    close: []
  }>()

  /** 模式选项：值 / 文案 / 图标（停靠=sidebar，悬浮=layers，全屏=expand） */
  const MODE_OPTIONS: Array<{ value: AgentMode; label: string; icon: string }> = [
    { value: 'docked', label: '停靠', icon: '&#xe6af;' },
    { value: 'floating', label: '悬浮', icon: '&#xe675;' },
    { value: 'fullscreen', label: '全屏', icon: '&#xe8ce;' }
  ]
</script>

<style lang="scss" scoped>
  .agent-mode-switcher {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    align-items: center;

    .mode-group {
      display: flex;
      gap: 2px;
      align-items: center;
      padding: 2px;
      background: var(--art-gray-100);
      border-radius: 8px;
    }

    .divider {
      width: 1px;
      height: 18px;
      margin: 0 2px;
      background: var(--art-border-color);
    }

    .mode-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      color: var(--art-text-gray-600);
      cursor: pointer;
      background: transparent;
      border: none;
      border-radius: 6px;
      transition:
        background-color 0.2s,
        color 0.2s;

      &:hover {
        color: var(--art-primary);
        background: var(--art-gray-200);
      }

      &.is-active {
        color: var(--art-primary);
        background: var(--art-main-bg-color);
        box-shadow: var(--art-box-shadow-sm, 0 1px 3px rgb(0 0 0 / 10%));
      }

      i {
        font-size: 16px;
      }
    }
  }
</style>
