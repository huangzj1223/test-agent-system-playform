<!-- AG-UI 错误卡片：脱敏错误信息 + 重试/复制 -->
<template>
  <div class="error-card">
    <div class="ec-head">
      <i class="iconfont-sys ec-icon">&#xe6c5;</i>
      <span class="ec-title">{{ title }}</span>
    </div>
    <div class="ec-message">{{ error.message }}</div>
    <div class="ec-actions">
      <ElButton size="small" type="primary" @click="emit('retry')">重试</ElButton>
      <ElButton size="small" @click="onCopy">复制错误信息</ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ElButton, ElMessage } from 'element-plus'
  import type { AiRunError } from '@/types/aiChat'

  defineOptions({ name: 'AiErrorCard' })

  const props = defineProps<{ error: AiRunError }>()
  const emit = defineEmits<{ retry: [] }>()

  /** 错误码 → 标题 */
  const title = computed(() => {
    const map: Record<string, string> = {
      auth: '鉴权失败',
      timeout: '请求超时',
      rate_limit: '服务限流',
      network: '连接中断',
      agent: 'Agent 执行失败'
    }
    return (props.error.code && map[props.error.code]) || '请求失败'
  })

  /** 复制错误信息（不含敏感数据，error.message 已由后端脱敏） */
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${title.value}：${props.error.message}`)
      ElMessage.success('已复制')
    } catch {
      ElMessage.error('复制失败')
    }
  }
</script>

<style lang="scss" scoped>
  .error-card {
    padding: 10px 12px;
    margin: 6px 0;
    background: rgba(var(--art-danger), 0.06);
    border: 1px solid rgba(var(--art-danger), 0.2);
    border-radius: 8px;

    .ec-head {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-bottom: 6px;

      .ec-icon {
        font-size: 14px;
        color: rgb(var(--art-danger));
      }

      .ec-title {
        font-size: 13px;
        font-weight: 600;
        color: rgb(var(--art-danger));
      }
    }

    .ec-message {
      margin-bottom: 8px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--art-text-gray-700);
      word-break: break-word;
    }

    .ec-actions {
      display: flex;
      gap: 8px;
    }
  }
</style>
