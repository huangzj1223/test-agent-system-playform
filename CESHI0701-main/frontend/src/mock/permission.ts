// @ts-nocheck
/**
 * 权限管理 Mock 数据（角色 / 菜单）
 * 字段与页面消费保持一致：
 * - 角色：id/name/label/remark/status/createTime + menuIds（权限分配）
 * - 菜单：type 数字（0目录/1菜单/2按钮）+ perms/orderNum/isShow/router/viewPath/keepAlive
 * - 列表统一返回 { list, pagination: { page, pageSize, total } }
 */

// ==================== 角色数据 ====================
const mockRoles = [
  {
    id: 1,
    name: '系统管理员',
    label: 'sys_admin',
    remark: '系统技术管理人员，拥有全量数据及系统管理功能权限',
    menuIds: [1, 11, 12, 2, 21, 22, 8, 81, 82, 83, 9, 91, 92],
    status: 1,
    createTime: '2024-01-01 10:00:00',
    updateTime: '2025-01-07 10:00:00'
  },
  {
    id: 2,
    name: '省公司管理员',
    label: 'province_admin',
    remark: '省公司级别的管理人员，可查看全省所有组织的风险数据',
    menuIds: [1, 11, 12, 2, 21, 22],
    status: 1,
    createTime: '2024-01-02 10:00:00',
    updateTime: '2025-01-06 15:30:00'
  },
  {
    id: 3,
    name: '分公司管理员',
    label: 'branch_admin',
    remark: '分公司级别的管理人员，可查看本分公司及下属库站的风险数据',
    menuIds: [1, 11, 2, 21],
    status: 1,
    createTime: '2024-01-03 10:00:00',
    updateTime: '2025-01-05 09:20:00'
  },
  {
    id: 4,
    name: '区/片公司管理员',
    label: 'district_admin',
    remark: '区/片公司级别的管理人员，可查看本区/片公司及下属库站的风险数据',
    menuIds: [1, 11, 2],
    status: 0,
    createTime: '2024-01-04 10:00:00',
    updateTime: '2025-01-04 14:10:00'
  },
  {
    id: 5,
    name: '库站管理员',
    label: 'station_admin',
    remark: '库站级别的管理人员，可查看和维护本库站的风险数据',
    menuIds: [1, 11],
    status: 1,
    createTime: '2024-01-05 10:00:00',
    updateTime: '2025-01-03 11:45:00'
  }
]

let nextRoleId = 6

// ==================== 菜单数据 ====================
// type：0=目录 1=菜单 2=按钮；isShow：1=显示 0=隐藏
const mockMenus = [
  {
    id: 1,
    parentId: null,
    name: '工作台',
    type: 0,
    icon: 'Monitor',
    router: '/dashboard',
    perms: '',
    viewPath: '',
    orderNum: 1,
    isShow: 1,
    keepAlive: 0,
    createTime: '2024-01-01 10:00:00',
    updateTime: '2025-03-01 09:00:00',
    children: [
      {
        id: 11,
        parentId: 1,
        name: '我的工作台',
        type: 1,
        icon: 'HomeFilled',
        router: '/dashboard/workbench',
        viewPath: '/dashboard/workbench/index.vue',
        perms: 'dashboard:workbench:view',
        orderNum: 1,
        isShow: 1,
        keepAlive: 1,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00'
      },
      {
        id: 12,
        parentId: 1,
        name: '数据大屏',
        type: 1,
        icon: 'DataBoard',
        router: '/dashboard/screen',
        viewPath: '/dashboard/screen/index.vue',
        perms: 'dashboard:screen:view',
        orderNum: 2,
        isShow: 1,
        keepAlive: 0,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00'
      }
    ]
  },
  {
    id: 2,
    parentId: null,
    name: '报表中心',
    type: 0,
    icon: 'PieChart',
    router: '/report',
    perms: '',
    viewPath: '',
    orderNum: 2,
    isShow: 1,
    keepAlive: 0,
    createTime: '2024-01-01 10:00:00',
    updateTime: '2025-03-01 09:00:00',
    children: [
      {
        id: 21,
        parentId: 2,
        name: '巡检统计',
        type: 1,
        icon: 'TrendCharts',
        router: '/report/inspection',
        viewPath: '/report/inspection/index.vue',
        perms: 'report:inspection:view',
        orderNum: 1,
        isShow: 1,
        keepAlive: 1,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00'
      },
      {
        id: 22,
        parentId: 2,
        name: '设备统计',
        type: 1,
        icon: 'Histogram',
        router: '/report/equipment',
        viewPath: '/report/equipment/index.vue',
        perms: 'report:equipment:view',
        orderNum: 2,
        isShow: 1,
        keepAlive: 1,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00'
      }
    ]
  },
  {
    id: 8,
    parentId: null,
    name: '组织管理',
    type: 0,
    icon: 'OfficeBuilding',
    router: '/organization',
    perms: '',
    viewPath: '',
    orderNum: 8,
    isShow: 1,
    keepAlive: 0,
    createTime: '2024-01-01 10:00:00',
    updateTime: '2025-03-01 09:00:00',
    children: [
      {
        id: 81,
        parentId: 8,
        name: '部门管理',
        type: 1,
        icon: 'Share',
        router: '/organization/department',
        viewPath: '/organization/department/index.vue',
        perms: 'org:department:view',
        orderNum: 1,
        isShow: 1,
        keepAlive: 1,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00'
      },
      {
        id: 82,
        parentId: 8,
        name: '用户管理',
        type: 1,
        icon: 'User',
        router: '/organization/user',
        viewPath: '/organization/user/index.vue',
        perms: 'org:user:view',
        orderNum: 2,
        isShow: 1,
        keepAlive: 1,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00'
      },
      {
        id: 83,
        parentId: 8,
        name: '岗位管理',
        type: 1,
        icon: 'Postcard',
        router: '/organization/position',
        viewPath: '/organization/position/index.vue',
        perms: 'org:position:view',
        orderNum: 3,
        isShow: 1,
        keepAlive: 1,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00'
      }
    ]
  },
  {
    id: 9,
    parentId: null,
    name: '权限管理',
    type: 0,
    icon: 'Lock',
    router: '/permission',
    perms: '',
    viewPath: '',
    orderNum: 9,
    isShow: 1,
    keepAlive: 0,
    createTime: '2024-01-01 10:00:00',
    updateTime: '2025-03-01 09:00:00',
    children: [
      {
        id: 91,
        parentId: 9,
        name: '角色管理',
        type: 1,
        icon: 'Avatar',
        router: '/permission/role',
        viewPath: '/permission/role/index.vue',
        perms: 'perm:role:view',
        orderNum: 1,
        isShow: 1,
        keepAlive: 1,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00',
        children: [
          {
            id: 911,
            parentId: 91,
            name: '新增角色',
            type: 2,
            icon: '',
            router: '',
            viewPath: '',
            perms: 'perm:role:add',
            orderNum: 1,
            isShow: 1,
            keepAlive: 0,
            createTime: '2024-01-01 10:00:00',
            updateTime: '2025-03-01 09:00:00'
          }
        ]
      },
      {
        id: 92,
        parentId: 9,
        name: '菜单管理',
        type: 1,
        icon: 'Menu',
        router: '/permission/menu',
        viewPath: '/permission/menu/index.vue',
        perms: 'perm:menu:view',
        orderNum: 2,
        isShow: 1,
        keepAlive: 1,
        createTime: '2024-01-01 10:00:00',
        updateTime: '2025-03-01 09:00:00'
      }
    ]
  }
]

// ==================== 角色 Mock 函数 ====================

/** 获取角色列表（分页） */
export function getRoleListMock(params = {}) {
  const { keyword, status, page = 1, pageSize = 10 } = params || {}
  let filtered = [...mockRoles]
  if (keyword) {
    const kw = keyword.toLowerCase()
    filtered = filtered.filter(
      (role) => role.name.toLowerCase().includes(kw) || role.label.toLowerCase().includes(kw)
    )
  }
  if (status !== undefined && status !== null && status !== '') {
    const statusValue = Number(status)
    filtered = filtered.filter((role) => role.status === statusValue)
  }
  const start = (page - 1) * pageSize
  const list = filtered.slice(start, start + Number(pageSize))
  return { list, pagination: { page: Number(page), pageSize: Number(pageSize), total: filtered.length } }
}

/** 获取角色详情 */
export function getRoleDetailMock(id) {
  const role = mockRoles.find((role) => role.id === id)
  if (!role) throw new Error('角色不存在')
  return role
}

/** 新增角色 */
export function addRoleMock(data) {
  const newRole = {
    id: nextRoleId++,
    name: data.name || '',
    label: data.label || '',
    remark: data.remark || '',
    menuIds: data.menuIds || [],
    status: data.status ?? 1,
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN')
  }
  mockRoles.unshift(newRole)
  return newRole
}

/** 更新角色 */
export function updateRoleMock(id, data) {
  const index = mockRoles.findIndex((role) => role.id === id)
  if (index === -1) return false
  mockRoles[index] = { ...mockRoles[index], ...data, updateTime: new Date().toLocaleString('zh-CN') }
  return true
}

/** 删除角色 */
export function deleteRoleMock(id) {
  const index = mockRoles.findIndex((role) => role.id === id)
  if (index === -1) throw new Error('角色不存在')
  mockRoles.splice(index, 1)
  return true
}

/** 批量删除角色 */
export function batchDeleteRolesMock(ids = []) {
  ids.forEach((id) => {
    const index = mockRoles.findIndex((role) => role.id === id)
    if (index !== -1) mockRoles.splice(index, 1)
  })
  return true
}

/** 更新角色状态 */
export function updateRoleStatusMock(id, status) {
  return updateRoleMock(id, { status })
}

/** 获取角色的菜单权限 ID 列表 */
export function getRoleMenusMock(id) {
  const role = mockRoles.find((role) => role.id === id)
  return role ? role.menuIds || [] : []
}

/** 设置角色的菜单权限 */
export function setRoleMenusMock(roleId, menuIds) {
  return updateRoleMock(roleId, { menuIds })
}

// ==================== 菜单 Mock 函数 ====================

let nextMenuId = 1000

/** 在菜单树中按 id 查找节点及其所在数组 */
function findMenuNode(list, id) {
  for (const menu of list) {
    if (menu.id === id) return { node: menu, siblings: list }
    if (menu.children) {
      const found = findMenuNode(menu.children, id)
      if (found) return found
    }
  }
  return null
}

/** 获取菜单树 */
export function getMenuTreeMock() {
  return mockMenus
}

/** 获取菜单列表（树形结构，与菜单树一致） */
export function getMenuListMock() {
  return mockMenus
}

/** 新增菜单 */
export function addMenuMock(data) {
  const newMenu = {
    id: nextMenuId++,
    parentId: data.parentId ?? null,
    name: data.name || '',
    type: data.type ?? 1,
    icon: data.icon || '',
    router: data.router || '',
    viewPath: data.viewPath || '',
    perms: data.perms || '',
    orderNum: data.orderNum || 1,
    isShow: data.isShow ?? 1,
    keepAlive: data.keepAlive ?? 0,
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN')
  }
  if (data.parentId) {
    const found = findMenuNode(mockMenus, data.parentId)
    if (found) {
      found.node.children = found.node.children || []
      found.node.children.push(newMenu)
      return newMenu
    }
  }
  mockMenus.push(newMenu)
  return newMenu
}

/** 更新菜单 */
export function updateMenuMock(id, data) {
  const found = findMenuNode(mockMenus, id)
  if (!found) return false
  Object.assign(found.node, data, { updateTime: new Date().toLocaleString('zh-CN') })
  return true
}

/** 删除菜单 */
export function deleteMenuMock(id) {
  const found = findMenuNode(mockMenus, id)
  if (!found) throw new Error('菜单不存在')
  const idx = found.siblings.findIndex((m) => m.id === id)
  found.siblings.splice(idx, 1)
  return true
}

/** 更新菜单显示状态 */
export function updateMenuStatusMock(id, isShow) {
  const found = findMenuNode(mockMenus, id)
  if (!found) return false
  found.node.isShow = isShow
  found.node.updateTime = new Date().toLocaleString('zh-CN')
  return true
}


