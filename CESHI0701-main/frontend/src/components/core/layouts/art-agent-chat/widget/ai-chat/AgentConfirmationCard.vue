<!-- 高风险操作确认卡片：智能体执行删除/提交等前，展示操作详情等待用户确认 -->
<template>
  <div v-if="pending" class="confirm-card">
    <div class="cc-head">
      <i class="iconfont-sys cc-icon">&#xe6c5;</i>
      <span class="cc-title">请确认操作</span>
    </div>
    <ul class="cc-body">
      <li><span class="cc-label">操作</span><span class="cc-value">{{ pending.actionLabel }}</span></li>
      <li><span class="cc-label">对象</span><span class="cc-value">{{ pending.target }}</span></li>
      <li><span class="cc-label">影响</span><span class="cc-value">{{ pending.impact }}</span></li>
      <li><span class="cc-label">执行人</span><span class="cc-value">{{ pending.operator }}</span></li>
    </ul>
    <div class="cc-actions">
      <button class="cc-btn cc-cancel" type="button" @click="onDecide(false)">取消</button>
      <button class="cc-btn cc-confirm" type="button" @click="onDecide(true)">确认执行</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { pendingConfirmation, resolveConfirmation } from '@/agent/action-confirmation'

  defineOptions({ name: 'AgentConfirmationCard' })

  /** 当前待确认请求（null 时不渲染） */
  const pending = pendingConfirmation

  /** 用户决策：确认或取消 */
  const onDecide = (confirmed: boolean) => resolveConfirmation(confirmed)
</script>

<style lang="scss" scoped>
  .confirm-card {
    padding: 12px 14px;
    margin: 8px 0;
    border: 1px solid rgba(var(--art-warning), 0.4);
    border-radius: 10px;
    background: rgba(var(--art-warning), 0.06);

    .cc-head {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-bottom: 10px;

      .cc-icon {
        color: rgb(var(--art-warning));
      }

      .cc-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--art-text-gray-900);
      }
    }

    .cc-body {
      padding: 0;
      margin: 0 0 12px;
      list-style: none;

      li {
        display: flex;
        gap: 8px;
        padding: 3px 0;
        font-size: 12px;
      }

      .cc-label {
        flex-shrink: 0;
        width: 44px;
        color: var(--art-text-gray-500);
      }

      .cc-value {
        color: var(--art-text-gray-900);
        word-break: break-all;
      }
    }

    .cc-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;

      .cc-btn {
        padding: 5px 16px;
        font-size: 12px;
        cursor: pointer;
        border: none;
        border-radius: 6px;
      }

      .cc-cancel {
        color: var(--art-text-gray-700);
        background: var(--art-gray-200);
      }

      .cc-confirm {
        color: #fff;
        background: rgb(var(--art-danger));
      }
    }
  }
</style>
