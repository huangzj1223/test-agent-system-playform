<!--
  统一头部：智能体名称 + 历史/新建 + 模式切换器（停靠/悬浮/全屏/设置/关闭）。
  取代 AgentChatHeader，供三种模式外壳共用。
-->
<template>
  <div class="agent-header">
    <div class="agent-title">
      <span class="agent-name">{{ agentName }}</span>
    </div>

    <div class="agent-actions">
      <!-- 历史会话 -->
      <ElTooltip content="历史会话" placement="bottom">
        <button class="action-btn" type="button" aria-label="历史会话" @click="emit('history')">
          <i class="iconfont-sys">&#xe764;</i>
        </button>
      </ElTooltip>

      <!-- 新建会话 -->
      <ElTooltip content="新建会话" placement="bottom">
        <button class="action-btn" type="button" aria-label="新建会话" @click="emit('new-chat')">
          <i class="iconfont-sys">&#xe602;</i>
        </button>
      </ElTooltip>

      <span class="divider"></span>

      <!-- 模式切换 + 设置 + 关闭 -->
      <AgentModeSwitcher
        :mode="mode"
        @set-mode="(m) => emit('set-mode', m)"
        @config="emit('config')"
        @close="emit('close')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElTooltip } from 'element-plus'
  import type { AgentMode } from '@/store/modules/agentChat'
  import AgentModeSwitcher from './AgentModeSwitcher.vue'

  defineOptions({ name: 'AgentHeader' })

  defineProps<{
    /** 当前智能体名称 */
    agentName: string
    /** 当前展示模式 */
    mode: AgentMode
  }>()

  const emit = defineEmits<{
    /** 切换模式 */
    'set-mode': [mode: AgentMode]
    /** 打开设置 */
    config: []
    /** 关闭智能体 */
    close: []
    /** 打开历史会话 */
    history: []
    /** 新建会话 */
    'new-chat': []
  }>()
</script>

<style lang="scss" scoped>
  .agent-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    height: 52px;
    padding: 0 12px 0 16px;
    border-bottom: 1px solid var(--art-border-color);

    .agent-title {
      display: flex;
      align-items: center;
      min-width: 0;

      .agent-name {
        overflow: hidden;
        font-size: 15px;
        font-weight: 600;
        color: var(--art-text-gray-900);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .agent-actions {
      display: flex;
      flex-shrink: 0;
      gap: 4px;
      align-items: center;

      .divider {
        width: 1px;
        height: 18px;
        margin: 0 2px;
        background: var(--art-border-color);
      }

      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
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
          background: var(--art-gray-100);
        }

        i {
          font-size: 16px;
        }
      }
    }
  }
</style>
