<!-- 历史版本弹窗：版本号/更新时间/更新人/变更说明，支持查看与回滚 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="`历史版本 · ${fileName}`"
    width="640px"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <ElTable :data="versions" size="small" max-height="360">
      <ElTableColumn label="版本号" width="130">
        <template #default="{ row }">
          <span class="ver-no">{{ (row as MemoryVersion).version }}</span>
          <ElTag v-if="(row as MemoryVersion).current" type="primary" size="small" effect="light">当前</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="更新时间" width="150" prop="time" />
      <ElTableColumn label="更新人" width="120" prop="updater" />
      <ElTableColumn label="变更说明" min-width="140" prop="note" show-overflow-tooltip />
      <ElTableColumn label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <ElButton size="small" text type="primary" @click="onView(row as MemoryVersion)">查看</ElButton>
          <ElButton
            v-if="!(row as MemoryVersion).current"
            size="small"
            text
            @click="onRollback(row as MemoryVersion)"
          >
            回滚
          </ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无历史版本</template>
    </ElTable>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElDialog, ElTable, ElTableColumn, ElButton, ElTag, ElMessageBox } from 'element-plus'
  import type { MemoryVersion } from './memory-constants'

  defineOptions({ name: 'MemoryVersionModal' })

  defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 文件名 */
    fileName: string
    /** 版本列表 */
    versions: MemoryVersion[]
  }>()

  const emit = defineEmits<{
    /** 可见性 */
    'update:visible': [value: boolean]
    /** 回滚到指定版本 */
    rollback: [version: string]
  }>()

  /** 查看版本：弹出该版本的内容快照 */
  const onView = (row: MemoryVersion) => {
    ElMessageBox.alert(row.content || '（该版本无内容）', `版本 ${row.version} · ${row.note || '无说明'}`, {
      confirmButtonText: '关闭',
      customClass: 'mem-version-view'
    })
  }

  /** 回滚：交由父级安全守卫统一处理确认（安全策略命中时弹二次确认）与提示 */
  const onRollback = (row: MemoryVersion) => {
    emit('rollback', row.version)
    emit('update:visible', false)
  }
</script>

<style lang="scss" scoped>
  .ver-no {
    margin-right: 6px;
    font-weight: 600;
  }
</style>
