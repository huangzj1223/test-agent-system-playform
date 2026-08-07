<template>
  <div class="organization-position">
    <ElCard shadow="never" class="filter-card">
      <ElForm :model="filterForm" :inline="true" class="filter-form">
        <ElFormItem label="岗位名称">
          <ElInput
            v-model="filterForm.keyword"
            placeholder="输入岗位名称"
            clearable
            class="filter-input"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :icon="Search" @click="handleSearch">搜索</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <ElCard shadow="never" class="table-card">
      <div class="table-header">
        <ElButton type="primary" :icon="Plus" @click="handleAdd">新增</ElButton>
      </div>

      <div class="table-container">
        <ElTable v-loading="loading" :data="tableData" height="100%" style="width: 100%">
          <ElTableColumn prop="name" label="岗位名称" min-width="150" />
          <ElTableColumn prop="description" label="岗位描述" min-width="250" show-overflow-tooltip />
          <ElTableColumn prop="orderNum" label="排序" width="100" align="center" />
          <ElTableColumn prop="createTime" label="创建时间" width="180" />
          <ElTableColumn label="操作" width="150" align="center" fixed="right">
            <template #default="{ row }">
              <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
              <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
    </ElCard>

    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="500px" @closed="resetForm">
      <ElForm ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <ElFormItem label="岗位名称" prop="name">
          <ElInput v-model="form.name" placeholder="请输入岗位名称" maxlength="50" />
        </ElFormItem>
        <ElFormItem label="岗位描述">
          <ElInput v-model="form.description" type="textarea" :rows="3" placeholder="请输入岗位描述" maxlength="200" />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="form.orderNum" :min="0" :max="9999" style="width: 100%" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitLoading" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Search, Plus } from '@element-plus/icons-vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import { getPositionList, addPosition, updatePosition, deletePosition } from '@/api/organization'
  import { usePositionAgentBridge } from './usePositionAgentBridge'

  defineOptions({ name: 'OrganizationPosition' })

  interface PositionItem {
    id: number
    name: string
    description: string | null
    orderNum: number
    createTime: string
  }

  const filterForm = reactive({ keyword: '' })
  const loading = ref(false)
  const tableData = ref<PositionItem[]>([])

  const dialogVisible = ref(false)
  const submitLoading = ref(false)
  const formRef = ref<FormInstance>()
  const form = reactive({
    id: undefined as number | undefined,
    name: '',
    description: '',
    orderNum: 0
  })
  const dialogTitle = computed(() => (form.id ? '编辑岗位' : '新增岗位'))

  const formRules: FormRules = {
    name: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }]
  }

  async function loadList() {
    loading.value = true
    try {
      const { data } = await getPositionList({ keyword: filterForm.keyword || undefined, pageSize: 100 })
      tableData.value = data?.list || []
    } catch {
      ElMessage.error('加载岗位列表失败')
    } finally {
      loading.value = false
    }
  }

  function handleSearch() { loadList() }

  function handleAdd() { dialogVisible.value = true }

  function handleEdit(row: PositionItem) {
    Object.assign(form, { id: row.id, name: row.name, description: row.description || '', orderNum: row.orderNum })
    dialogVisible.value = true
  }

  async function handleDelete(row: PositionItem) {
    try {
      await ElMessageBox.confirm(`确定要删除岗位"${row.name}"吗？`, '提示', { type: 'warning' })
      await deletePosition(row.id)
      ElMessage.success('删除成功')
      loadList()
    } catch (error: any) {
      if (error !== 'cancel') ElMessage.error(error.message || '删除失败')
    }
  }

  async function handleSubmit() {
    try {
      await formRef.value?.validate()
      submitLoading.value = true
      const data = { name: form.name, description: form.description || undefined, orderNum: form.orderNum }
      if (form.id) {
        await updatePosition({ id: form.id, ...data })
      } else {
        await addPosition(data)
      }
      ElMessage.success(form.id ? '更新成功' : '新增成功')
      dialogVisible.value = false
      loadList()
    } catch (error: any) {
      if (error !== false) ElMessage.error(error.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  }

  function resetForm() {
    formRef.value?.resetFields()
    Object.assign(form, { id: undefined, name: '', description: '', orderNum: 0 })
  }

  onMounted(() => loadList())

  // 注册岗位页智能体操作与上下文快照，生命周期由 composable 管理
  usePositionAgentBridge({
    tableData,
    filterForm,
    form,
    onSearch: handleSearch,
    onRefresh: loadList,
    onAdd: handleAdd,
    onEdit: handleEdit,
    onSubmit: handleSubmit
  })
</script>

<style lang="scss" scoped>
  .organization-position {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .filter-card {
      flex-shrink: 0;
      border: none !important;
      box-shadow: none !important;
      border-radius: 12px;

      :deep(.el-card__body) { padding: 12px 20px; }

      .filter-form {
        @include responsiveFilterForm();
      }
    }

    .table-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: none !important;
      box-shadow: none !important;
      border-radius: 12px;

      :deep(.el-card__body) {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 16px;
      }

      .table-header {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
      }

      .table-container {
        flex: 1;
        overflow: hidden;
      }
    }
  }
</style>