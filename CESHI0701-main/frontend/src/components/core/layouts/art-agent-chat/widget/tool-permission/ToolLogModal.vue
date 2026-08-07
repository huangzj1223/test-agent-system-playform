<!-- 工具调用日志弹窗：调用记录表格，支持查看详情 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="tool ? `工具调用日志：${tool.name}` : '工具调用日志'"
    width="820px"
    top="8vh"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <ElTable :data="logs" size="small" max-height="440">
      <ElTableColumn label="调用时间" width="160" prop="time" />
      <ElTableColumn label="调用智能体" width="120" prop="agent" />
      <ElTableColumn label="关联 Skill" min-width="140" prop="skill" show-overflow-tooltip />
      <ElTableColumn label="输入参数" min-width="160">
        <template #default="{ row }">
          <code class="tl-params">{{ (row as ToolCallLog).params }}</code>
        </template>
      </ElTableColumn>
      <ElTableColumn label="执行状态" width="90">
        <template #default="{ row }">
          <ElTag :type="(row as ToolCallLog).success ? 'success' : 'danger'" size="small">
            {{ (row as ToolCallLog).success ? '成功' : '失败' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="耗时" width="80" prop="duration" />
      <ElTableColumn label="操作人" width="90" prop="operator" />
      <ElTableColumn label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <ElButton type="primary" size="small" link @click="onDetail(row as ToolCallLog)">查看详情</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无调用记录</template>
    </ElTable>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElDialog, ElTable, ElTableColumn, ElButton, ElTag, ElMessageBox } from 'element-plus'
  import type { AgentTool, ToolCallLog } from './types'

  defineOptions({ name: 'ToolLogModal' })

  defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 目标工具 */
    tool: AgentTool | null
    /** 该工具调用日志 */
    logs: ToolCallLog[]
  }>()

  const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

  /** 查看日志详情（展示完整参数与状态） */
  const onDetail = (row: ToolCallLog) => {
    const detail =
      `调用时间：${row.time}\n` +
      `调用智能体：${row.agent}\n` +
      `关联 Skill：${row.skill}\n` +
      `输入参数：${row.params}\n` +
      `执行状态：${row.success ? '成功' : '失败'}\n` +
      `耗时：${row.duration}\n` +
      `操作人：${row.operator}`
    ElMessageBox.alert(detail, '调用详情', { confirmButtonText: '关闭' })
  }
</script>

<style lang="scss" scoped>
  .tl-params {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    font-size: 12px;
    color: var(--art-text-gray-600);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
