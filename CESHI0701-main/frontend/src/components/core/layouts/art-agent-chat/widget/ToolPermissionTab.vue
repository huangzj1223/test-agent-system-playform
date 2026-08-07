<!-- 工具权限：统计卡片 + 左侧分类导航 + 中间权限表格 + 配置/测试/日志/新建弹窗，前端状态实现 -->
<template>
  <div class="tool-permission">
    <!-- 顶部统计卡片 -->
    <ToolStatsCards :stats="store.stats" />

    <!-- 主体：左侧分类 | 中间表格 -->
    <div class="tp-body">
      <ToolCategoryList :categories="store.categories" :active="store.filter.category" @select="store.selectCategory" />

      <ToolPermissionTable
        :tools="store.pagedTools"
        :total="store.total"
        :page="store.pagination.page"
        :page-size="store.pagination.pageSize"
        :active-category="store.filter.category"
        @filter="store.applyFilter"
        @page-change="store.changePage"
        @size-change="onSizeChange"
        @create="openCreate"
        @config="openConfig"
        @test="openTest"
        @log="openLog"
        @toggle="onToggle"
        @duplicate="onDuplicate"
      />
    </div>

    <!-- 配置 / 新建弹窗 -->
    <ToolFormModal v-model:visible="formVisible" :editing="editing" @save="onSave" />

    <!-- 测试弹窗 -->
    <ToolTestModal v-model:visible="testVisible" :tool="store.selected" />

    <!-- 日志弹窗 -->
    <ToolLogModal v-model:visible="logVisible" :tool="store.selected" :logs="store.selectedLogs" />
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useAgentToolStore } from '@/store/modules/agentTool'
  import ToolStatsCards from './tool-permission/ToolStatsCards.vue'
  import ToolCategoryList from './tool-permission/ToolCategoryList.vue'
  import ToolPermissionTable from './tool-permission/ToolPermissionTable.vue'
  import ToolFormModal from './tool-permission/ToolFormModal.vue'
  import ToolTestModal from './tool-permission/ToolTestModal.vue'
  import ToolLogModal from './tool-permission/ToolLogModal.vue'
  import type { AgentTool } from './tool-permission/types'

  defineOptions({ name: 'ToolPermissionTab' })

  const store = useAgentToolStore()

  /** 弹窗可见态 */
  const formVisible = ref(false)
  const testVisible = ref(false)
  const logVisible = ref(false)
  /** 表单编辑目标（null=新建） */
  const editing = ref<AgentTool | null>(null)

  /** 改每页条数并回到第 1 页 */
  const onSizeChange = (size: number) => {
    store.pagination.pageSize = size
    store.changePage(1)
  }

  /** 打开新建 */
  const openCreate = () => {
    editing.value = null
    formVisible.value = true
  }

  /** 打开配置（编辑） */
  const openConfig = (tool: AgentTool) => {
    editing.value = tool
    formVisible.value = true
  }

  /** 打开测试 */
  const openTest = (tool: AgentTool) => {
    store.setSelected(tool)
    testVisible.value = true
  }

  /** 打开日志 */
  const openLog = (tool: AgentTool) => {
    store.setSelected(tool)
    logVisible.value = true
  }

  /** 切换启用状态 */
  const onToggle = (tool: AgentTool, enabled: boolean) => {
    store.toggleEnabled(tool.id, enabled)
    ElMessage.success(enabled ? `已启用 ${tool.name}` : `已禁用 ${tool.name}`)
  }

  /** 复制工具：生成副本存入 store 并置顶 */
  const onDuplicate = (tool: AgentTool) => {
    const copy: AgentTool = {
      ...tool,
      id: `tool-${Date.now()}`,
      name: `${tool.name}-copy`,
      key: `${tool.key}-copy`,
      config: { ...tool.config },
      applicableAgents: [...tool.applicableAgents]
    }
    store.saveTool(copy)
    ElMessage.success('已复制工具')
  }

  /** 保存工具（新建或更新） */
  const onSave = (tool: AgentTool) => {
    store.saveTool(tool)
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .tool-permission {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .tp-body {
    display: flex;
    flex: 1;
    gap: 12px;
    min-height: 0;
  }
</style>
