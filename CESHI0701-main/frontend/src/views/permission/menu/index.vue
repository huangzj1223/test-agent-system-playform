<template>
  <div class="permission-menu">
    <!-- 筛选卡片 -->
    <ElCard shadow="never" class="filter-card">
      <ElForm :inline="true" :model="filterForm" class="filter-form">
        <ElFormItem label="菜单名称">
          <ElInput
            v-model="filterForm.keyword"
            placeholder="输入菜单名称"
            clearable
            class="filter-input"
          />
        </ElFormItem>
        <ElFormItem label="菜单类型">
          <ElSelect v-model="filterForm.type" placeholder="请选择" clearable class="filter-select">
            <ElOption label="目录" :value="0" />
            <ElOption label="菜单" :value="1" />
            <ElOption label="按钮" :value="2" />
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
        <ElButton type="primary" :icon="Plus" @click="handleAdd()">新增</ElButton>
        <ElButton @click="toggleExpand">{{ isExpanded ? '折叠' : '展开' }}</ElButton>
      </div>

      <div class="table-container">
        <ElTable
          ref="tableRef"
          v-loading="loading"
          :data="tableData"
          :key="tableKey"
          row-key="id"
          :tree-props="{ children: 'children' }"
          :default-expand-all="isExpanded"
          height="100%"
          style="width: 100%"
        >
          <ElTableColumn prop="name" label="菜单名称" min-width="200" />
          <ElTableColumn label="类型" width="100" align="center">
            <template #default="{ row }">
              <ElTag v-if="row.type === 0" type="warning">目录</ElTag>
              <ElTag v-else-if="row.type === 1" type="success">菜单</ElTag>
              <ElTag v-else-if="row.type === 2" type="info">按钮</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="图标" width="80" align="center">
            <template #default="{ row }">
              <ElIcon v-if="getIconComponent(row.icon)" :size="18">
                <component :is="getIconComponent(row.icon)" />
              </ElIcon>
              <span v-else-if="row.icon">{{ row.icon }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="perms" label="权限标识" width="200" />
          <ElTableColumn prop="orderNum" label="排序" width="100" align="center" />
          <ElTableColumn prop="updateTime" label="更新时间" width="180" />
          <ElTableColumn label="显示" width="100" align="center">
            <template #default="{ row }">
              <ElSwitch
                v-model="row.isShow"
                :active-value="1"
                :inactive-value="0"
                @change="handleStatusChange(row)"
              />
            </template>
          </ElTableColumn>
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
        <ElFormItem label="菜单类型" prop="type">
          <ElRadioGroup v-model="form.type">
            <ElRadio :value="0">目录</ElRadio>
            <ElRadio :value="1">菜单</ElRadio>
            <ElRadio :value="2">按钮</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="菜单名称" prop="name">
          <ElInput v-model="form.name" placeholder="请输入菜单名称" />
        </ElFormItem>
        <ElFormItem label="上级菜单">
          <ElTreeSelect
            v-model="form.parentId"
            :data="menuTreeOptions"
            :props="{ label: 'name' }"
            node-key="id"
            placeholder="请选择上级菜单"
            clearable
            check-strictly
            :render-after-expand="false"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem v-if="form.type !== 2" label="路由路径">
          <ElInput v-model="form.router" placeholder="请输入路由路径" />
        </ElFormItem>
        <ElFormItem v-if="form.type === 1" label="组件路径">
          <ElInput v-model="form.viewPath" placeholder="请输入组件路径" />
        </ElFormItem>
        <ElFormItem v-if="form.type !== 2" label="菜单图标">
          <ElInput v-model="form.icon" placeholder="请输入图标名称" />
        </ElFormItem>
        <ElFormItem label="权限标识">
          <ElInput v-model="form.perms" placeholder="请输入权限标识（如：sys:menu:list）" />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="form.orderNum" :min="0" :max="9999" style="width: 100%" />
        </ElFormItem>
        <ElFormItem label="是否显示">
          <ElRadioGroup v-model="form.isShow">
            <ElRadio :value="1">显示</ElRadio>
            <ElRadio :value="0">隐藏</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem v-if="form.type === 1" label="缓存">
          <ElRadioGroup v-model="form.keepAlive">
            <ElRadio :value="1">是</ElRadio>
            <ElRadio :value="0">否</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, computed } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Search, Plus } from '@element-plus/icons-vue'
  import * as Icons from '@element-plus/icons-vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import {
    getMenuTree,
    addMenu,
    updateMenu,
    deleteMenu,
    updateMenuStatus
  } from '@/api/permission'
  import { useMenuAgentBridge } from './useMenuAgentBridge'

  defineOptions({ name: 'PermissionMenu' })

  // 按图标名取 Element Plus 图标组件，无匹配返回 null（图标列渲染用）
  const getIconComponent = (iconName?: string | null) => {
    if (!iconName) return null
    return Icons[iconName as keyof typeof Icons] ?? null
  }

  interface MenuItem {
    id: number
    parentId: number | null
    name: string
    router: string | null
    perms: string | null
    type: number
    icon: string | null
    orderNum: number
    viewPath: string | null
    keepAlive: number
    isShow: number
    createTime: string
    updateTime: string
    children?: MenuItem[]
  }

  const filterForm = reactive({
    keyword: '',
    type: undefined as number | undefined
  })

  const loading = ref(false)
  const tableData = ref<MenuItem[]>([])
  const isExpanded = ref(true)
  const tableRef = ref()
  const tableKey = ref(0)

  const dialogVisible = ref(false)
  const dialogTitle = ref('')
  const formRef = ref<FormInstance>()
  const form = reactive({
    id: undefined as number | undefined,
    type: 1 as number,
    name: '',
    parentId: undefined as number | undefined,
    router: '',
    viewPath: '',
    icon: '',
    perms: '',
    orderNum: 0,
    isShow: 1,
    keepAlive: 1
  })

  const formRules: FormRules = {
    type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
    name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }]
  }
  const menuTreeOptions = computed(() => {
    const filterButtons = (menus: MenuItem[]): MenuItem[] => {
      return menus
        .filter((menu) => menu.type !== 2)
        .map((menu) => ({
          ...menu,
          children: menu.children ? filterButtons(menu.children) : undefined
        }))
    }
    return filterButtons(tableData.value)
  })

  const fetchMenuList = async () => {
    loading.value = true
    try {
      const { data } = await getMenuTree()
      let list: MenuItem[] = data || []
      if (filterForm.keyword) {
        list = filterTreeByName(list, filterForm.keyword)
      }
      if (filterForm.type !== undefined) {
        list = filterTreeByType(list, filterForm.type)
      }
      tableData.value = list
    } catch {
      ElMessage.error('获取菜单列表失败')
    } finally {
      loading.value = false
    }
  }

  const filterTreeByName = (tree: MenuItem[], keyword: string): MenuItem[] => {
    return tree.reduce<MenuItem[]>((acc, item) => {
      const children = item.children ? filterTreeByName(item.children, keyword) : []
      if (item.name.includes(keyword) || children.length > 0) {
        acc.push({ ...item, children: children.length > 0 ? children : item.children })
      }
      return acc
    }, [])
  }

  const filterTreeByType = (tree: MenuItem[], type: number): MenuItem[] => {
    return tree.reduce<MenuItem[]>((acc, item) => {
      const children = item.children ? filterTreeByType(item.children, type) : []
      if (item.type === type || children.length > 0) {
        acc.push({ ...item, children })
      }
      return acc
    }, [])
  }

  const handleSearch = () => { fetchMenuList() }

  const toggleExpand = () => {
    isExpanded.value = !isExpanded.value
    tableKey.value++
  }
  const handleAdd = (parentId?: number) => {
    dialogTitle.value = '新增菜单'
    form.parentId = parentId
    dialogVisible.value = true
  }

  const handleEdit = (row: MenuItem) => {
    dialogTitle.value = '编辑菜单'
    Object.assign(form, {
      id: row.id,
      type: row.type,
      name: row.name,
      parentId: row.parentId ?? undefined,
      router: row.router || '',
      viewPath: row.viewPath || '',
      icon: row.icon || '',
      perms: row.perms || '',
      orderNum: row.orderNum,
      isShow: row.isShow,
      keepAlive: row.keepAlive
    })
    dialogVisible.value = true
  }

  const handleDelete = async (row: MenuItem) => {
    try {
      await ElMessageBox.confirm('确定要删除该菜单吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deleteMenu(row.id)
      ElMessage.success('删除成功')
      fetchMenuList()
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '删除失败')
      }
    }
  }

  const handleStatusChange = async (row: MenuItem) => {
    try {
      await updateMenuStatus(row.id, row.isShow)
      ElMessage.success('状态更新成功')
    } catch {
      ElMessage.error('状态更新失败')
      row.isShow = row.isShow === 1 ? 0 : 1
    }
  }

  const handleSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (valid) {
        try {
          const data = {
            name: form.name,
            type: form.type,
            parentId: form.parentId,
            router: form.router || undefined,
            viewPath: form.viewPath || undefined,
            icon: form.icon || undefined,
            perms: form.perms || undefined,
            orderNum: form.orderNum,
            isShow: form.isShow,
            keepAlive: form.keepAlive
          }
          if (form.id) {
            await updateMenu({ id: form.id, ...data })
          } else {
            await addMenu(data)
          }
          ElMessage.success(form.id ? '更新成功' : '新增成功')
          dialogVisible.value = false
          fetchMenuList()
        } catch {
          ElMessage.error('操作失败')
        }
      }
    })
  }

  const resetForm = () => {
    formRef.value?.resetFields()
    Object.assign(form, {
      id: undefined,
      type: 1,
      name: '',
      parentId: undefined,
      router: '',
      viewPath: '',
      icon: '',
      perms: '',
      orderNum: 0,
      isShow: 1,
      keepAlive: 1
    })
  }

  onMounted(() => { fetchMenuList() })

  // 注册菜单页智能体操作与上下文快照，生命周期由 composable 管理
  useMenuAgentBridge({
    tableData,
    filterForm,
    form,
    onSearch: handleSearch,
    onRefresh: fetchMenuList,
    onToggleExpand: () => {
      toggleExpand()
      return isExpanded.value
    },
    onAdd: handleAdd,
    onEdit: handleEdit,
    onSubmit: handleSubmit
  })
</script>

<style lang="scss" scoped>
  .permission-menu {
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
        gap: 12px;
        margin-bottom: 16px;
      }

      .table-container {
        flex: 1;
        overflow: hidden;
      }
    }

    .iconfont-sys {
      font-size: 18px;
    }
  }
</style>
