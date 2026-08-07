<!-- AG-UI 执行步骤：轻量步骤区，仅在有真实步骤事件时显示 -->
<template>
  <div v-if="steps.length" class="run-steps">
    <div
      v-for="(step, i) in steps"
      :key="`${step.name}-${i}`"
      class="step-item"
      :class="`is-${step.status}`"
    >
      <span class="step-icon">
        <span v-if="step.status === 'running'" class="spinner"></span>
        <i v-else class="iconfont-sys">&#xe816;</i>
      </span>
      <span class="step-name">{{ step.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { AiRunStep } from '@/types/aiChat'

  defineOptions({ name: 'AiRunSteps' })

  defineProps<{ steps: AiRunStep[] }>()
</script>

<style lang="scss" scoped>
  .run-steps {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    margin-bottom: 6px;
    background: var(--art-gray-100);
    border-radius: 8px;

    .step-item {
      display: flex;
      gap: 6px;
      align-items: center;
      font-size: 12px;
      color: var(--art-text-gray-600);

      .step-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;

        i {
          font-size: 13px;
          color: rgb(var(--art-success));
        }

        .spinner {
          width: 10px;
          height: 10px;
          border: 2px solid rgba(var(--art-primary), 0.3);
          border-top-color: rgb(var(--art-primary));
          border-radius: 50%;
          animation: step-spin 0.7s linear infinite;
        }
      }

      &.is-finished {
        color: var(--art-text-gray-700);
      }
    }
  }

  @keyframes step-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
