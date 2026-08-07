<template>
  <div class="permission-role">
    <!-- 筛选卡片 -->
    <ElCard shadow="never" class="filter-card">
      <ElForm :inline="true" :model="filterForm" class="filter-form">
        <ElFormItem label="角色名称">
          <ElInput
            v-model="filterForm.keyword"
            placeholder="输入角色名称"
            clearable
            class="filter-input"
          />
        </ElFormItem>
        <ElFormItem label="角色状态">
          <ElSelect v-model="filterForm.status" placeholder="请选择" clearable class="filter-select">
            <ElOption label="启用" :value="1" />
            <ElOption label="禁用" :value="0" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :icon="Search" @click="handleSearch">搜索</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>

    <!-- 表格卡片 -->
    <ElCard shadow="never" class="table-card">
      <div class="table-header">
        <ElButton type="primary" :icon="Plus" @click="handleAdd">新增</ElButton>
      </div>

      <div class="table-container">
        <ElTable v-loading="loading" :data="tableData" height="100%" style="width: 100%">
          <ElTableColumn prop="id" label="ID" width="80" align="center" />
          <ElTableColumn prop="name" label="名称" min-width="150" />
          <ElTableColumn prop="label" label="标识" width="150" />
          <ElTableColumn prop="remark" label="备注" min-width="200" show-overflow-tooltip />
          <ElTableColumn prop="createTime" label="创建时间" width="180" />
          <ElTableColumn label="操作" width="250" align="center" fixed="right">
            <template #default="{ row }">
              <ElButton link type="primary" @click="handleEdit(row)">编辑</ElButton>
              <ElButton link type="primary" @click="handleAssignPermissions(row)">分配权限</ElButton>
              <ElButton link type="danger" @click="handleDelete(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>

      <div class="pagination-container">
        <ElPagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchRoleList"
          @current-change="fetchRoleList"
        />
      </div>
    </ElCard>

    <!-- 新增/编辑对话框 -->
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="600px" @closed="resetForm">
      <ElForm ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <ElFormItem label="角色标识" prop="label">
          <ElInput v-model="form.label" placeholder="请输入角色标识（英文）" />
        </ElFormItem>
        <ElFormItem label="角色名称" prop="name">
          <ElInput v-model="form.name" placeholder="请输入角色名称" />
        </ElFormItem>
        <ElFormItem label="备注">
          <ElInput v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="form.status">
            <ElRadio :value="1">启用</ElRadio>
            <ElRadio :value="0">禁用</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 分配权限对话框 -->
    <ElDialog
      v-model="permissionDialogVisible"
      title="分配权限"
      width="600px"
      @closed="resetPermissionForm"
    >
      <div class="permission-tree-container">
        <div class="tree-header">
          <ElCheckbox
            v-model="checkAll"
            :indeterminate="isIndeterminate"
            @change="handleCheckAllChange"
          >
            全选/不全选
          </ElCheckbox>
          <ElButton link @click="handleExpandAll">
            {{ isTreeExpanded ? '折叠' : '展开' }}
          </ElButton>
        </div>
        <ElTree
          ref="treeRef"
          :data="menuTreeData"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          show-checkbox
          :default-expand-all="isTreeExpanded"
          :default-checked-keys="checkedMenuIds"
          @check="handleTreeCheck"
        />
      </div>
      <template #footer>
        <ElButton @click="permissionDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmitPermissions">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Search, Plus } from '@element-plus/icons-vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import {
    getRoleList,
    addRole,
    updateRole,
    deleteRole,
    updateRoleStatus,
    getRoleMenus,
    setRoleMenus,
    getMenuTree
  } from '@/api/permission'
  import { useRoleAgentBridge } from './useRoleAgentBridge'

  defineOptions({ name: 'PermissionRole' })

  interface RoleItem {
    id: number
    name: string
    label: string | null
    remark: string | null
    status: number
    createTime: string
    updateTime: string
  }

  interface MenuItem {
    id: number
    name: string
    children?: MenuItem[]
  }

  const filterForm = reactive({
    keyword: '',
    status: undefined as number | undefined
  })

  const loading = ref(false)
  const tableData = ref<RoleItem[]>([])
  const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

  const dialogVisible = ref(false)
  const dialogTitle = ref('')
  const formRef = ref<FormInstance>()
  const form = reactive({
    id: undefined as number | undefined,
    label: '',
    name: '',
    remark: '',
    status: 1
  })

  const formRules: FormRules = {
    name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
  }
  // 权限分配
  const permissionDialogVisible = ref(false)
  const currentRole = ref<RoleItem | null>(null)
  const menuTreeData = ref<MenuItem[]>([])
  const treeRef = ref()
  const checkedMenuIds = ref<number[]>([])
  const checkAll = ref(false)
  const isIndeterminate = ref(false)
  const isTreeExpanded = ref(true)

  const fetchRoleList = async () => {
    loading.value = true
    try {
      const params = {
        keyword: filterForm.keyword || undefined,
        status: filterForm.status,
        page: pagination.page,
        pageSize: pagination.pageSize
      }
      const { data } = await getRoleList(params)
      tableData.value = data?.list || []
      pagination.total = data?.pagination?.total || 0
    } catch {
      ElMessage.error('获取角色列表失败')
    } finally {
      loading.value = false
    }
  }

  const handleSearch = () => {
    pagination.page = 1
    fetchRoleList()
  }

  const handleAdd = () => {
    dialogTitle.value = '新增角色'
    dialogVisible.value = true
  }

  const handleEdit = (row: RoleItem) => {
    dialogTitle.value = '编辑角色'
    Object.assign(form, {
      id: row.id,
      label: row.label || '',
      name: row.name,
      remark: row.remark || '',
      status: row.status
    })
    dialogVisible.value = true
  }

  const handleDelete = async (row: RoleItem) => {
    try {
      await ElMessageBox.confirm('确定要删除该角色吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deleteRole(row.id)
      ElMessage.success('删除成功')
      fetchRoleList()
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '删除失败')
      }
    }
  }

  const handleStatusChange = async (row: RoleItem) => {
    try {
      await updateRoleStatus(row.id, row.status)
      ElMessage.success('状态更新成功')
    } catch {
      ElMessage.error('状态更新失败')
      row.status = row.status === 1 ? 0 : 1
    }
  }
  const handleSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (valid) {
        try {
          const data = {
            name: form.name,
            label: form.label || undefined,
            remark: form.remark || undefined,
            status: form.status
          }
          if (form.id) {
            await updateRole({ id: form.id, ...data })
          } else {
            await addRole(data)
          }
          ElMessage.success(form.id ? '更新成功' : '新增成功')
          dialogVisible.value = false
          fetchRoleList()
        } catch {
          ElMessage.error('操作失败')
        }
      }
    })
  }

  const resetForm = () => {
    formRef.value?.resetFields()
    Object.assign(form, { id: undefined, label: '', name: '', remark: '', status: 1 })
  }

  const handleAssignPermissions = async (row: RoleItem) => {
    currentRole.value = row
    permissionDialogVisible.value = true
    try {
      const [menuRes, permsRes] = await Promise.all([
        getMenuTree(),
        getRoleMenus(row.id)
      ])
      menuTreeData.value = menuRes.data || []
      checkedMenuIds.value = permsRes.data || []
      updateCheckAllStatus()
    } catch {
      ElMessage.error('获取权限数据失败')
    }
  }

  const handleExpandAll = () => {
    isTreeExpanded.value = !isTreeExpanded.value
    const nodes = treeRef.value?.store?.nodesMap
    if (nodes) {
      Object.values(nodes).forEach((node: any) => {
        node.expanded = isTreeExpanded.value
      })
    }
  }

  const handleCheckAllChange = (val: any) => {
    if (val) {
      treeRef.value?.setCheckedKeys(getAllMenuIds(menuTreeData.value))
    } else {
      treeRef.value?.setCheckedKeys([])
    }
    isIndeterminate.value = false
  }

  const getAllMenuIds = (menus: MenuItem[]): number[] => {
    const ids: number[] = []
    const traverse = (items: MenuItem[]) => {
      items.forEach((item) => {
        ids.push(item.id)
        if (item.children?.length) traverse(item.children)
      })
    }
    traverse(menus)
    return ids
  }

  const handleTreeCheck = () => { updateCheckAllStatus() }

  const updateCheckAllStatus = () => {
    const checkedCount = treeRef.value?.getCheckedKeys()?.length || 0
    const allCount = getAllMenuIds(menuTreeData.value).length
    checkAll.value = checkedCount === allCount
    isIndeterminate.value = checkedCount > 0 && checkedCount < allCount
  }

  const handleSubmitPermissions = async () => {
    if (!currentRole.value) return
    try {
      const checkedKeys = treeRef.value?.getCheckedKeys() || []
      const halfCheckedKeys = treeRef.value?.getHalfCheckedKeys() || []
      const menuIds = [...checkedKeys, ...halfCheckedKeys]
      await setRoleMenus(currentRole.value.id, menuIds)
      ElMessage.success('分配权限成功')
      permissionDialogVisible.value = false
    } catch {
      ElMessage.error('分配权限失败')
    }
  }

  const resetPermissionForm = () => {
    currentRole.value = null
    menuTreeData.value = []
    checkedMenuIds.value = []
    checkAll.value = false
    isIndeterminate.value = false
  }

  onMounted(() => { fetchRoleList() })

  // 注册角色页智能体操作与上下文快照，生命周期由 composable 管理
  useRoleAgentBridge({
    tableData,
    filterForm,
    pagination,
    form,
    onSearch: handleSearch,
    onRefresh: fetchRoleList,
    onAdd: handleAdd,
    onEdit: handleEdit,
    onSubmit: handleSubmit
  })
</script>

<style lang="scss" scoped>
  .permission-role {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

    .filter-card {
      margin-bottom: 16px;
      border-radius: 12px;
      border: none !important;
      box-shadow: none !important;
      flex-shrink: 0;

      :deep(.el-card__body) {
        padding: 12px 20px;
      }

      .filter-form {
        @include responsiveFilterForm();
      }
    }

    .table-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 12px;
      border: none !important;
      box-shadow: none !important;

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

      .pagination-container {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
        flex-shrink: 0;
      }
    }

    .permission-tree-container {
      max-height: 500px;
      overflow: auto;

      .tree-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #ebeef5;
      }
    }
  }
</style>
