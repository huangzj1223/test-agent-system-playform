<!-- 运行日志页签：左侧分类导航 + 顶部筛选 + 日志表格 + 详情抽屉 + 导出弹窗，数据来自后端 /admin/agent-run-log -->
<template>
  <div class="run-logs">
    <!-- 主体：左侧分类 | 右侧（筛选 + 表格） -->
    <div class="rl-body">
      <LogCategoryList
        :categories="store.categories"
        :active="store.filter.category"
        @select="store.selectCategory"
      />

      <div class="rl-main">
        <LogFilterBar @filter="store.applyFilter" @export="exportVisible = true" />

        <RunLogTable
          :logs="store.pagedLogs"
          :total="store.total"
          :page="store.pagination.page"
          :page-size="store.pagination.pageSize"
          @detail="openDetail"
          @page-change="store.changePage"
          @size-change="store.changePageSize"
        />
      </div>
    </div>

    <!-- 详情抽屉 -->
    <RunLogDetailDrawer
      v-model:visible="detailVisible"
      :log="store.selected"
      @export="onExportSingle"
      @mark-processed="store.markProcessed"
    />

    <!-- 导出弹窗 -->
    <LogExportModal v-model:visible="exportVisible" />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useAgentRunLogStore } from '@/store/modules/agentRunLog'
  import LogCategoryList from './run-logs/LogCategoryList.vue'
  import LogFilterBar from './run-logs/LogFilterBar.vue'
  import RunLogTable from './run-logs/RunLogTable.vue'
  import RunLogDetailDrawer from './run-logs/RunLogDetailDrawer.vue'
  import LogExportModal from './run-logs/LogExportModal.vue'
  import type { AgentRunLog } from './run-logs/runLogTypes'

  defineOptions({ name: 'RunLogsTab' })

  const store = useAgentRunLogStore()

  /** 详情抽屉可见态 */
  const detailVisible = ref(false)
  /** 导出弹窗可见态 */
  const exportVisible = ref(false)

  /** 进入页签即加载首屏数据（列表 + 分类计数） */
  onMounted(() => store.load())

  /** 打开详情：设置选中日志并展开抽屉 */
  const openDetail = (log: AgentRunLog) => {
    store.setSelected(log)
    detailVisible.value = true
  }

  /** 从详情抽屉导出单条日志（模拟） */
  const onExportSingle = () => {
    ElMessage.success('日志导出任务已创建')
  }
</script>

<style lang="scss" scoped>
  .run-logs {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .rl-body {
    display: flex;
    flex: 1;
    gap: 12px;
    min-height: 0;
  }

  .rl-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    height: 100%;
    min-height: 0;
    padding: 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }
</style>
