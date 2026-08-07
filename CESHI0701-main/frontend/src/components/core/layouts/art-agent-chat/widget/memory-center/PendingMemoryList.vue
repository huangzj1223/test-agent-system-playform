<!-- 待确认记忆：模型建议写入的记忆候选，支持确认/忽略/更多 -->
<template>
  <div class="pending-list">
    <div class="pl-header">
      <span class="pl-title">待确认记忆</span>
      <ElTag v-if="items.length" type="warning" size="small" effect="light" round>{{ items.length }}</ElTag>
    </div>

    <div class="pl-items">
      <div v-for="item in items" :key="item.id" class="pl-item">
        <i class="iconfont-sys pl-icon">&#xe816;</i>
        <div class="pl-info">
          <div class="pl-text">{{ item.text }}</div>
          <div class="pl-target">建议写入 {{ item.target }}</div>
        </div>
        <div class="pl-actions">
          <ElButton type="primary" size="small" @click="emit('confirm', { id: item.id })">确认</ElButton>
          <ElButton size="small" text @click="emit('ignore', item.id)">忽略</ElButton>
          <ElDropdown trigger="click" @command="(cmd: string) => onCommand(cmd, item)">
            <span class="pl-more"><i class="iconfont-sys">&#xe6df;</i></span>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem command="source">查看来源</ElDropdownItem>
                <ElDropdownItem command="edit">编辑后确认</ElDropdownItem>
                <ElDropdownItem command="delete" divided>删除</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </div>

      <div v-if="!items.length" class="pl-empty">暂无待确认记忆</div>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ElButton, ElTag, ElDropdown, ElDropdownMenu, ElDropdownItem, ElMessage, ElMessageBox } from 'element-plus'
  import type { PendingMemory } from './memory-constants'

  defineOptions({ name: 'PendingMemoryList' })

  defineProps<{
    /** 待确认记忆列表 */
    items: PendingMemory[]
  }>()

  const emit = defineEmits<{
    /** 确认写入（可携带编辑后的文本覆盖原候选） */
    confirm: [payload: { id: string; text?: string }]
    /** 忽略 */
    ignore: [id: string]
  }>()

  /** 更多下拉命令处理：查看来源/编辑后确认/删除 */
  const onCommand = async (cmd: string, item: PendingMemory) => {
    if (cmd === 'source') {
      ElMessageBox.alert(item.source, '记忆来源', { confirmButtonText: '知道了' })
      return
    }
    if (cmd === 'edit') {
      try {
        const { value } = await ElMessageBox.prompt('编辑后写入目标文件', '编辑后确认', {
          inputValue: item.text,
          inputType: 'textarea',
          confirmButtonText: '确认写入',
          cancelButtonText: '取消'
        })
        // 通过 emit 把编辑后的文本交给父层/store 处理，不直接修改 props
        emit('confirm', { id: item.id, text: value })
      } catch {
        // 用户取消
      }
      return
    }
    if (cmd === 'delete') {
      emit('ignore', item.id)
      ElMessage.success('已删除该待确认记忆')
    }
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .pending-list {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .pl-header {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid var(--art-border-color);

    .pl-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }
  }

  .pl-items {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
  }

  .pl-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-bottom: 1px solid var(--art-border-color);

    &:last-child {
      border-bottom: none;
    }

    .pl-icon {
      flex-shrink: 0;
      margin-top: 2px;
      font-size: 16px;
      color: var(--art-text-gray-400);
    }

    .pl-info {
      flex: 1;
      min-width: 0;
    }

    .pl-text {
      font-size: 13px;
      line-height: 1.5;
      color: var(--art-text-gray-800);
    }

    .pl-target {
      margin-top: 4px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    .pl-actions {
      display: flex;
      flex-shrink: 0;
      gap: 2px;
      align-items: center;
    }

    .pl-more {
      display: inline-flex;
      align-items: center;
      padding: 4px;
      color: var(--art-text-gray-500);
      cursor: pointer;
      border-radius: 4px;

      &:hover {
        background: var(--art-gray-100);
      }
    }
  }

  .pl-empty {
    padding: 24px 0;
    font-size: 13px;
    color: var(--art-text-gray-400);
    text-align: center;
  }
</style>
