<!-- 记忆权限设置：控制模型对该记忆文件的读取/建议/自动写入/确认/审计权限 -->
<template>
  <div class="perm-panel">
    <div v-for="row in rows" :key="row.key" class="perm-row">
      <div class="perm-meta">
        <div class="perm-label">{{ row.label }}</div>
        <div class="perm-hint">{{ row.hint }}</div>
      </div>
      <ElSwitch
        :model-value="permission[row.key]"
        @update:model-value="(v) => emit('change', { [row.key]: Boolean(v) })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElSwitch } from 'element-plus'
  import type { MemoryPermission } from './memory-constants'

  defineOptions({ name: 'MemoryPermissionPanel' })

  defineProps<{
    /** 当前文件权限配置 */
    permission: MemoryPermission
  }>()

  const emit = defineEmits<{
    /** 权限变更（局部 patch） */
    change: [patch: Partial<MemoryPermission>]
  }>()

  /** 权限项配置：字段 key + 标题 + 说明 */
  const rows: { key: keyof MemoryPermission; label: string; hint: string }[] = [
    { key: 'enabled', label: '启用记忆', hint: '关闭后该记忆不参与对话' },
    { key: 'canRead', label: '允许模型读取', hint: '对话时可引用该记忆内容' },
    { key: 'canSuggest', label: '允许模型建议修改', hint: '可提出写入建议待人工确认' },
    { key: 'canAutoWrite', label: '允许自动写入', hint: '低风险经验可自动追加' },
    { key: 'needConfirm', label: '高风险需人工确认', hint: '高风险写入必须人工确认' },
    { key: 'auditLog', label: '记录审计日志', hint: '记录每次读取与写入操作' }
  ]
</script>

<style lang="scss" scoped>
  .perm-panel {
    display: flex;
    flex-direction: column;
  }

  .perm-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--art-border-color);

    &:last-child {
      border-bottom: none;
    }

    .perm-meta {
      min-width: 0;
    }

    .perm-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--art-text-gray-800);
    }

    .perm-hint {
      margin-top: 2px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }
</style>
