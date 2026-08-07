<template>
  <div class="organization-department">
    <!-- 筛选卡片 -->
    <ElCard shadow="never" class="filter-card">
      <ElForm :model="filterForm" :inline="true" class="filter-form">
        <ElFormItem label="部门名称">
          <ElInput
            v-model="filterForm.name"
            placeholder="输入部门名称"
            clearable
            class="filter-input"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :icon="Search" @click="handleSearch">搜索</ElButton>
          <ElButton @click="handleReset">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 表格卡片 -->
    <ElCard shadow="never" class="table-card">
      <div class="table-header">
        <ElButton type="primary" :icon="Plus" @click="handleAdd()">新增</ElButton>
        <ElButton @click="toggleExpand">{{ isExpanded ? '折叠' : '展开' }}</ElButton>
      </div>

      <div class="table-container">
        <ElTable
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          row-key="id"
          :tree-props="{ children: 'children' }"
          :default-expand-all="isExpanded"
          height="100%"
          style="width: 100%"
        >
          <ElTableColumn prop="name" label="部门名称" min-width="200" />
          <ElTableColumn prop="type" label="类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="row.type"
                :type="typeTagMap[row.type]?.tagType"
                size="small"
                disable-transitions
              >
                {{ row.type }}
              </el-tag>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="leader" label="负责人" width="120" />
          <ElTableColumn prop="orderNum" label="排序" width="100" align="center" />
          <ElTableColumn prop="updateTime" label="更新时间" width="180" />
          <ElTableColumn label="操作" width="200" align="center" fixed="right">
            <template #default="{ row }">
              <ElButton link type="primary" @click="handleAdd(row.id)">新增</ElButton>
              <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
              <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
    </ElCard>

    <!-- 新增/编辑对话框 -->
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="600px" @closed="resetForm">
      <ElForm ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <ElFormItem label="部门名称" prop="name">
          <ElInput v-model="form.name" placeholder="请输入部门名称" />
        </ElFormItem>
        <ElFormItem label="上级部门">
          <ElTreeSelect
            v-model="form.parentId"
            :data="departmentTreeOptions"
            :props="{ label: 'name' }"
            node-key="id"
            placeholder="请选择上级部门"
            clearable
            check-strictly
            :render-after-expand="false"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="部门类型" prop="type">
          <ElSelect v-model="form.type" placeholder="请选择部门类型" style="width: 100%">
            <ElOption label="省公司" value="省公司" />
            <ElOption label="分公司" value="分公司" />
            <ElOption label="部门" value="部门" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="负责人">
          <ElInput v-model="form.leader" placeholder="请输入负责人" />
        </ElFormItem>
        <ElFormItem label="联系电话">
          <ElInput v-model="form.phone" placeholder="请输入联系电话" />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInput v-model="form.orderNum" placeholder="请输入排序" style="width: 100%" />
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
  import { ref, reactive, computed, onMounted, nextTick } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { Search, Plus } from '@element-plus/icons-vue'
  import { departmentApi, type Department } from '@/api/department'
  import { useDepartmentAgentBridge } from './useDepartmentAgentBridge'

  defineOptions({ name: 'OrganizationDepartment' })

  const typeTagMap: Record<
    string,
    { tagType: 'primary' | 'success' | 'info' | 'warning' | 'danger' }
  > = {
    省公司: { tagType: 'danger' },
    分公司: { tagType: 'warning' },
    部门: { tagType: 'primary' }
  }

  const tableRef = ref()
  const loading = ref(false)
  const tableData = ref<Department[]>([])
  const isExpanded = ref(true)

  const filterForm = reactive({ name: '', status: '' as any })

  const dialogVisible = ref(false)
  const isEditing = ref(false)
  const dialogTitle = computed(() => (isEditing.value ? '编辑部门' : '新增部门'))
  const submitLoading = ref(false)

  const formRef = ref<FormInstance>()
  const form = reactive<Partial<Department>>({
    id: undefined,
    name: '',
    parentId: null,
    type: undefined,
    leader: '',
    phone: '',
    orderNum: 0
  })

  const formRules: FormRules = {
    name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
    type: [{ required: true, message: '请选择部门类型', trigger: 'change' }]
  }

  const departmentTreeOptions = computed(() => {
    if (isEditing.value && form.id) {
      return filterCurrentDepartment(tableData.value, form.id)
    }
    return tableData.value
  })

  function filterCurrentDepartment(departments: Department[], currentId: number): Department[] {
    return departments
      .filter((dept) => dept.id !== currentId)
      .map((dept) => ({
        ...dept,
        children: dept.children ? filterCurrentDepartment(dept.children, currentId) : []
      }))
  }

  async function loadDepartmentList() {
    loading.value = true
    try {
      const { data } = await departmentApi.getTree()
      let list = data || []
      if (filterForm.name) {
        list = filterTreeByName(list, filterForm.name)
      }
      // 树形表格按 row-key 缓存节点，直接替换数据时被删的子节点可能残留。
      // 先清空并等一次渲染，让 ElTable 的树状态重建，再填充新数据，确保删除后即时消失。
      tableData.value = []
      await nextTick()
      tableData.value = list
    } catch (error: any) {
      ElMessage.error(error.message || '加载部门列表失败')
    } finally {
      loading.value = false
    }
  }

  function filterTreeByName(tree: Department[], keyword: string): Department[] {
    return tree.reduce<Department[]>((acc, item) => {
      const children = item.children ? filterTreeByName(item.children, keyword) : []
      if (item.name.includes(keyword) || children.length > 0) {
        acc.push({ ...item, children: children.length > 0 ? children : item.children })
      }
      return acc
    }, [])
  }

  function handleSearch() {
    loadDepartmentList()
  }

  function handleReset() {
    filterForm.name = ''
    filterForm.status = ''
    loadDepartmentList()
  }

  // default-expand-all 仅初始化生效，动态折叠/展开需通过 tableRef 逐行设置
  function toggleExpand() {
    isExpanded.value = !isExpanded.value
    setRowsExpansion(tableData.value, isExpanded.value)
  }

  // 递归遍历树形数据，对每个含子节点的行设置展开状态
  function setRowsExpansion(rows: Department[], expanded: boolean) {
    rows.forEach((row) => {
      const children = row.children
      if (children && children.length > 0) {
        tableRef.value?.toggleRowExpansion(row, expanded)
        setRowsExpansion(children, expanded)
      }
    })
  }

  function handleAdd(parentId?: number) {
    isEditing.value = false
    dialogVisible.value = true
    if (parentId) form.parentId = parentId
  }

  function handleEdit(row: Department) {
    isEditing.value = true
    dialogVisible.value = true
    Object.assign(form, {
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      type: row.type,
      leader: row.leader,
      phone: row.phone,
      orderNum: row.orderNum
    })
  }

  async function handleDelete(row: Department) {
    try {
      await ElMessageBox.confirm(`确定要删除部门"${row.name}"吗？`, '提示', { type: 'warning' })
      await departmentApi.delete(row.id)
      ElMessage.success('删除成功')
      loadDepartmentList()
    } catch (error: any) {
      if (error !== 'cancel') ElMessage.error(error.message || '删除失败')
    }
  }

  async function handleStatusChange(row: Department) {
    try {
      await departmentApi.updateStatus(row.id, row.status!)
      ElMessage.success('状态更新成功')
    } catch (error: any) {
      ElMessage.error(error.message || '状态更新失败')
      row.status = row.status === 1 ? 0 : 1
    }
  }

  async function handleSubmit() {
    try {
      await formRef.value?.validate()
      submitLoading.value = true
      const data = {
        name: form.name!,
        parentId: form.parentId,
        type: form.type || undefined,
        leader: form.leader || undefined,
        phone: form.phone || undefined,
        orderNum: form.orderNum
      }
      if (isEditing.value && form.id) {
        await departmentApi.update({ id: form.id, ...data })
        ElMessage.success('更新成功')
      } else {
        await departmentApi.add(data)
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
      loadDepartmentList()
    } catch (error: any) {
      if (error !== false) ElMessage.error(error.message || '操作失败')
    } finally {
      submitLoading.value = false
    }
  }

  function resetForm() {
    formRef.value?.resetFields()
    Object.assign(form, {
      id: undefined,
      name: '',
      parentId: null,
      type: undefined,
      leader: '',
      phone: '',
      orderNum: 0
    })
  }

  // ==================== 智能体桥接（抽离到 composable） ====================
  onMounted(() => {
    loadDepartmentList()
  })

  // 注册智能体操作与页面上下文快照，生命周期由 composable 内部管理
  useDepartmentAgentBridge({
    tableData,
    tableRef,
    filterForm,
    form,
    onSearch: handleSearch,
    onReset: handleReset,
    onRefresh: loadDepartmentList,
    onEdit: handleEdit,
    onSubmit: handleSubmit,
    onAdd: handleAdd
  })
</script>

<style lang="scss" scoped>
  .organization-department {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .filter-card {
      flex-shrink: 0;
      border: none !important;
      box-shadow: none !important;
      border-radius: 12px;

      :deep(.el-card__body) {
        padding: 12px 20px;
      }

      .filter-form {
        @include responsiveFilterForm();
      }
    }

    .table-card {
      flex: 1;
      border: none !important;
      box-shadow: none !important;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      :deep(.el-card__body) {
        padding: 20px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .table-header {
        flex-shrink: 0;
        margin-bottom: 16px;
        display: flex;
        gap: 12px;
      }

      .table-container {
        flex: 1;
        overflow: hidden;
      }
    }
  }
</style>
