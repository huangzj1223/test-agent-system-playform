<!-- 模型建议弹窗：模型对该记忆文件提出的写入建议，支持应用/忽略/编辑后应用 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="`模型建议 · ${fileName}`"
    width="600px"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="sug-list">
      <div v-for="(sug, idx) in suggestions" :key="sug.id" class="sug-item">
        <div class="sug-index">{{ idx + 1 }}</div>
        <div class="sug-text">{{ sug.text }}</div>
        <div class="sug-actions">
          <ElButton type="primary" size="small" @click="emit('apply', { id: sug.id })">应用建议</ElButton>
          <ElButton size="small" @click="onEditApply(sug)">编辑后应用</ElButton>
          <ElButton size="small" text @click="emit('ignore', sug.id)">忽略</ElButton>
        </div>
      </div>

      <div v-if="!suggestions.length" class="sug-empty">暂无模型建议</div>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElDialog, ElButton, ElMessageBox } from 'element-plus'
  import type { ModelSuggestion } from './memory-constants'

  defineOptions({ name: 'MemorySuggestionModal' })

  defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 文件名 */
    fileName: string
    /** 建议列表 */
    suggestions: ModelSuggestion[]
  }>()

  const emit = defineEmits<{
    /** 可见性 */
    'update:visible': [value: boolean]
    /** 应用建议（可携带编辑后的文本覆盖原建议） */
    apply: [payload: { id: string; text?: string }]
    /** 忽略建议 */
    ignore: [id: string]
  }>()

  /** 编辑后应用：先弹出编辑框，确认后把编辑文本随 emit 交给 store 处理 */
  const onEditApply = async (sug: ModelSuggestion) => {
    try {
      const { value } = await ElMessageBox.prompt('编辑后写入当前文件', '编辑后应用', {
        inputValue: sug.text,
        inputType: 'textarea',
        confirmButtonText: '应用',
        cancelButtonText: '取消'
      })
      emit('apply', { id: sug.id, text: value })
    } catch {
      // 用户取消
    }
  }
</script>

<style lang="scss" scoped>
  .sug-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sug-item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 12px 14px;
    background: var(--art-gray-100);
    border-radius: 8px;

    .sug-index {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      font-size: 12px;
      font-weight: 600;
      color: var(--art-primary);
      background: rgba(var(--art-primary), 0.1);
      border-radius: 50%;
    }

    .sug-text {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--art-text-gray-800);
    }

    .sug-actions {
      display: flex;
      flex-shrink: 0;
      gap: 2px;
      align-items: center;
    }
  }

  .sug-empty {
    padding: 24px 0;
    font-size: 13px;
    color: var(--art-text-gray-400);
    text-align: center;
  }
</style>
