<!-- 运行日志表格：时间/智能体/类型/内容摘要/状态/耗时/操作 + 分页 -->
<template>
  <div class="run-log-table">
    <!-- mock 数据已按时间倒序排列；不开启本地 sortable（仅会重排当前页），排序应在 store 层对全量做 -->
    <ElTable :data="logs" size="default" class="rlt-table">
      <ElTableColumn label="时间" prop="startedAt" width="180" />
      <ElTableColumn label="智能体" min-width="140">
        <template #default="{ row }">
          <div class="rlt-agent">
            <i class="iconfont-sys rlt-agent-icon">&#xe816;</i>
            <span>{{ (row as AgentRunLog).agentName }}</span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="类型" width="110">
        <template #default="{ row }">
          <ElTag
            :type="typeMeta(row as AgentRunLog).tagType"
            size="small"
            effect="light"
            :class="typeMeta(row as AgentRunLog).className"
          >
            {{ typeMeta(row as AgentRunLog).label }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="内容摘要" min-width="280" show-overflow-tooltip prop="summary" />
      <ElTableColumn label="状态" width="100">
        <template #default="{ row }">
          <ElTag
            :type="statusMeta(row as AgentRunLog).tagType"
            size="small"
            effect="light"
            :class="statusMeta(row as AgentRunLog).className"
          >
            {{ statusMeta(row as AgentRunLog).label }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="耗时" width="100">
        <template #default="{ row }">
          {{ formatDuration((row as AgentRunLog).durationMs) }}
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <ElButton type="primary" size="small" link @click="emit('detail', row as AgentRunLog)">
            查看详情
          </ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无日志</template>
    </ElTable>

    <!-- 分页 -->
    <div class="rlt-pager">
      <ElPagination
        layout="total, prev, pager, next, sizes"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        @current-change="(p: number) => emit('page-change', p)"
        @size-change="(s: number) => emit('size-change', s)"
      />
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ElTable, ElTableColumn, ElTag, ElButton, ElPagination } from 'element-plus'
  import {
    LOG_TYPE_META,
    LOG_STATUS_META,
    formatDuration,
    type AgentRunLog
  } from './runLogTypes'

  defineOptions({ name: 'RunLogTable' })

  defineProps<{
    /** 当前页日志 */
    logs: AgentRunLog[]
    /** 过滤后总数 */
    total: number
    /** 当前页码 */
    page: number
    /** 每页条数 */
    pageSize: number
  }>()

  const emit = defineEmits<{
    /** 查看详情 */
    detail: [log: AgentRunLog]
    /** 翻页 */
    'page-change': [page: number]
    /** 改每页条数 */
    'size-change': [size: number]
  }>()

  /** 类型显示配置 */
  const typeMeta = (row: AgentRunLog) => LOG_TYPE_META[row.type] || LOG_TYPE_META.conversation
  /** 状态显示配置 */
  const statusMeta = (row: AgentRunLog) => LOG_STATUS_META[row.status] || LOG_STATUS_META.success
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .run-log-table {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    height: 100%;
    min-height: 0;
  }

  .rlt-table {
    flex: 1;
    min-height: 0;

    .rlt-agent {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .rlt-agent-icon {
      font-size: 15px;
      color: var(--art-text-gray-500);
    }

    // 类型自定义配色：技能调用=紫、记忆命中=青（Element 原生无此语义）
    :deep(.lt-skill) {
      color: #7c3aed;
      background: rgba(124, 58, 237, 0.1);
      border-color: rgba(124, 58, 237, 0.25);
    }

    :deep(.lt-memory) {
      color: #0891b2;
      background: rgba(8, 145, 178, 0.1);
      border-color: rgba(8, 145, 178, 0.25);
    }
  }

  .rlt-pager {
    display: flex;
    flex-shrink: 0;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
