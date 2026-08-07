// @ts-nocheck
/**
 * 组织管理 Mock 数据（部门 / 用户 / 岗位）
 * 字段与页面消费保持一致：
 * - 用户：name + 嵌套 department/position + userRoles
 * - 列表统一返回 { list, pagination: { page, pageSize, total } }
 * - 部门树字段：name/type/leader/orderNum/status/children
 * 角色与菜单的 Mock 见 permission.ts
 */

import { mockPositions } from './position'

// ==================== 部门数据 ====================
const mockDepartments = [
  {
    id: 1,
    name: '总公司',
    parentId: null,
    type: '省公司',
    leader: '张三',
    phone: '13800138001',
    orderNum: 1,
    status: 1,
    createTime: '2024-01-01 10:00:00',
    updateTime: '2025-03-01 09:00:00',
    children: [
      {
        id: 2,
        name: '北京分公司',
        parentId: 1,
        type: '分公司',
        leader: '李四',
        phone: '13800138002',
        orderNum: 1,
        status: 1,
        createTime: '2024-01-02 10:00:00',
        updateTime: '2025-03-01 09:00:00',
        children: [
          {
            id: 21,
            name: '技术部',
            parentId: 2,
            type: '部门',
            leader: '王五',
            phone: '13800138021',
            orderNum: 1,
            status: 1,
            createTime: '2024-01-03 10:00:00',
            updateTime: '2025-03-01 09:00:00'
          },
          {
            id: 22,
            name: '市场部',
            parentId: 2,
            type: '部门',
            leader: '赵六',
            phone: '13800138022',
            orderNum: 2,
            status: 1,
            createTime: '2024-01-03 10:00:00',
            updateTime: '2025-03-01 09:00:00'
          }
        ]
      },
      {
        id: 3,
        name: '上海分公司',
        parentId: 1,
        type: '分公司',
        leader: '孙七',
        phone: '13800138003',
        orderNum: 2,
        status: 1,
        createTime: '2024-01-02 10:00:00',
        updateTime: '2025-03-01 09:00:00',
        children: [
          {
            id: 31,
            name: '财务部',
            parentId: 3,
            type: '部门',
            leader: '周八',
            phone: '13800138031',
            orderNum: 1,
            status: 1,
            createTime: '2024-01-03 10:00:00',
            updateTime: '2025-03-01 09:00:00'
          },
          {
            id: 32,
            name: '人事部',
            parentId: 3,
            type: '部门',
            leader: '吴九',
            phone: '13800138032',
            orderNum: 2,
            status: 1,
            createTime: '2024-01-03 10:00:00',
            updateTime: '2025-03-01 09:00:00'
          }
        ]
      }
    ]
  }
]

let nextDepartmentId = 100

// ==================== 用户数据 ====================
// 字段与用户管理页面一致：name/username/phone/email/status/departmentId/positionId
// 嵌套对象：department:{id,name}、position:{id,name}、userRoles:[{role:{id,name}}]
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    name: '管理员',
    phone: '13800138000',
    email: '1144837984@qq.com',
    status: 1,
    departmentId: 1,
    department: { id: 1, name: '总公司' },
    positionId: 1,
    position: { id: 1, name: '总经理' },
    userRoles: [{ role: { id: 1, name: '系统管理员' } }],
    createTime: '2024-01-01 10:00:00',
    updateTime: '2025-03-01 09:00:00'
  },
  {
    id: 3,
    username: 'liuzhy002',
    name: '李四',
    phone: '13800138002',
    email: 'lisi@example.com',
    status: 1,
    departmentId: 2,
    department: { id: 2, name: '北京分公司' },
    positionId: 2,
    position: { id: 2, name: '分公司经理' },
    userRoles: [{ role: { id: 3, name: '分公司管理员' } }],
    createTime: '2024-01-02 10:00:00',
    updateTime: '2025-03-01 09:00:00'
  },
  {
    id: 4,
    username: 'wangwu003',
    name: '王五',
    phone: '13800138021',
    email: 'wangwu@example.com',
    status: 1,
    departmentId: 21,
    department: { id: 21, name: '技术部' },
    positionId: 3,
    position: { id: 3, name: '部门经理' },
    userRoles: [{ role: { id: 5, name: '库站管理员' } }],
    createTime: '2024-01-03 10:00:00',
    updateTime: '2025-03-01 09:00:00'
  },
  {
    id: 5,
    username: 'zhaoliu004',
    name: '赵六',
    phone: '13800138022',
    email: 'zhaoliu@example.com',
    status: 1,
    departmentId: 22,
    department: { id: 22, name: '市场部' },
    positionId: 3,
    position: { id: 3, name: '部门经理' },
    userRoles: [{ role: { id: 5, name: '库站管理员' } }],
    createTime: '2024-01-03 10:00:00',
    updateTime: '2025-03-01 09:00:00'
  },
  {
    id: 6,
    username: 'sunqi005',
    name: '孙七',
    phone: '13800138003',
    email: 'sunqi@example.com',
    status: 1,
    departmentId: 3,
    department: { id: 3, name: '上海分公司' },
    positionId: 2,
    position: { id: 2, name: '分公司经理' },
    userRoles: [{ role: { id: 3, name: '分公司管理员' } }],
    createTime: '2024-01-02 10:00:00',
    updateTime: '2025-03-01 09:00:00'
  },
  {
    id: 7,
    username: 'zhouba006',
    name: '周八',
    phone: '13800138031',
    email: 'zhouba@example.com',
    status: 0,
    departmentId: 31,
    department: { id: 31, name: '财务部' },
    positionId: 4,
    position: { id: 4, name: '员工' },
    userRoles: [{ role: { id: 5, name: '库站管理员' } }],
    createTime: '2024-01-03 10:00:00',
    updateTime: '2025-03-01 09:00:00'
  },
  {
    id: 8,
    username: 'wujiu007',
    name: '吴九',
    phone: '13800138032',
    email: 'wujiu@example.com',
    status: 1,
    departmentId: 32,
    department: { id: 32, name: '人事部' },
    positionId: 4,
    position: { id: 4, name: '员工' },
    userRoles: [{ role: { id: 5, name: '库站管理员' } }],
    createTime: '2024-01-03 10:00:00',
    updateTime: '2025-03-01 09:00:00'
  }
]

let nextUserId = 100

// ==================== 部门 Mock 函数 ====================

/** 递归按名称筛选部门树 */
function filterDepartmentsByName(departments, name) {
  return departments
    .map((dept) => {
      const matched = dept.name.includes(name)
      const children = dept.children ? filterDepartmentsByName(dept.children, name) : []
      if (matched || children.length > 0) {
        return { ...dept, children: children.length > 0 ? children : dept.children }
      }
      return null
    })
    .filter(Boolean)
}

/** 获取部门树 */
export function getDepartmentTreeMock(params = {}) {
  const { name } = params || {}
  if (name) {
    return filterDepartmentsByName(mockDepartments, name)
  }
  return mockDepartments
}

/** 获取部门列表（与树结构一致，页面以树形展示） */
export function getDepartmentListMock(params = {}) {
  return getDepartmentTreeMock(params)
}

/** 新增部门 */
export function addDepartmentMock(data) {
  const newDept = {
    id: nextDepartmentId++,
    name: data.name || '',
    parentId: data.parentId || null,
    type: data.type || '部门',
    leader: data.leader || '',
    phone: data.phone || '',
    orderNum: data.orderNum || 1,
    status: data.status ?? 1,
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN')
  }
  if (data.parentId) {
    const addToParent = (list) => {
      for (const dept of list) {
        if (dept.id === data.parentId) {
          dept.children = dept.children || []
          dept.children.push(newDept)
          return true
        }
        if (dept.children && addToParent(dept.children)) return true
      }
      return false
    }
    addToParent(mockDepartments)
  } else {
    mockDepartments.push(newDept)
  }
  return newDept
}

/** 更新部门 */
export function updateDepartmentMock(id, data) {
  const updateInTree = (list) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i] = { ...list[i], ...data, updateTime: new Date().toLocaleString('zh-CN') }
        return true
      }
      if (list[i].children && updateInTree(list[i].children)) return true
    }
    return false
  }
  return updateInTree(mockDepartments)
}

/** 更新部门状态 */
export function updateDepartmentStatusMock(id, status) {
  const updateInTree = (list) => {
    for (const dept of list) {
      if (dept.id === id) {
        dept.status = status
        dept.updateTime = new Date().toLocaleString('zh-CN')
        return true
      }
      if (dept.children && updateInTree(dept.children)) return true
    }
    return false
  }
  return updateInTree(mockDepartments)
}

/** 删除部门 */
export function deleteDepartmentMock(id) {
  const deleteFromTree = (list) => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list.splice(i, 1)
        return true
      }
      if (list[i].children && deleteFromTree(list[i].children)) return true
    }
    return false
  }
  if (deleteFromTree(mockDepartments)) return true
  throw new Error('部门不存在')
}

// ==================== 用户 Mock 函数 ====================

/** 获取用户列表（分页） */
export function getUserListMock(params = {}) {
  const { keyword, departmentId, status, page = 1, pageSize = 10 } = params || {}
  let filtered = [...mockUsers]

  // 关键词匹配：姓名 / 账号 / 手机号
  if (keyword) {
    filtered = filtered.filter(
      (u) =>
        u.name?.includes(keyword) ||
        u.username?.includes(keyword) ||
        u.phone?.includes(keyword)
    )
  }
  if (departmentId !== undefined && departmentId !== null && departmentId !== '') {
    const deptId = typeof departmentId === 'string' ? parseInt(departmentId) : departmentId
    filtered = filtered.filter((u) => u.departmentId === deptId)
  }
  if (status !== undefined && status !== null && status !== '') {
    const statusValue = typeof status === 'string' ? parseInt(status) : status
    filtered = filtered.filter((u) => u.status === statusValue)
  }

  const start = (page - 1) * pageSize
  const list = filtered.slice(start, start + Number(pageSize))
  return { list, pagination: { page: Number(page), pageSize: Number(pageSize), total: filtered.length } }
}

/** 获取用户详情 */
export function getUserDetailMock(id) {
  const user = mockUsers.find((u) => u.id === id)
  if (!user) throw new Error('用户不存在')
  return user
}

/** 新增用户 */
export function addUserMock(data) {
  const dept = findDepartmentById(data.departmentId)
  const pos = mockPositions.find((p) => p.id === data.positionId)
  const newUser = {
    id: nextUserId++,
    username: data.username || '',
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    status: data.status ?? 1,
    departmentId: data.departmentId,
    department: dept ? { id: dept.id, name: dept.name } : undefined,
    positionId: data.positionId,
    position: pos ? { id: pos.id, name: pos.name } : undefined,
    userRoles: buildUserRoles(data.roleIds),
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN')
  }
  mockUsers.unshift(newUser)
  return newUser
}

/** 在部门树中按 id 查找部门 */
function findDepartmentById(id) {
  if (id === undefined || id === null) return null
  const find = (list) => {
    for (const dept of list) {
      if (dept.id === id) return dept
      if (dept.children) {
        const found = find(dept.children)
        if (found) return found
      }
    }
    return null
  }
  return find(mockDepartments)
}

/** 根据角色 id 列表构造 userRoles 结构 */
function buildUserRoles(roleIds) {
  if (!Array.isArray(roleIds)) return []
  return roleIds.map((rid) => ({ role: { id: rid, name: `角色${rid}` } }))
}

/** 更新用户 */
export function updateUserMock(id, data) {
  const index = mockUsers.findIndex((u) => u.id === id)
  if (index === -1) return false
  const patch = { ...data }
  // 同步嵌套的部门/岗位/角色展示对象
  if (data.departmentId !== undefined) {
    const dept = findDepartmentById(data.departmentId)
    patch.department = dept ? { id: dept.id, name: dept.name } : undefined
  }
  if (data.positionId !== undefined) {
    const pos = mockPositions.find((p) => p.id === data.positionId)
    patch.position = pos ? { id: pos.id, name: pos.name } : undefined
  }
  if (data.roleIds !== undefined) {
    patch.userRoles = buildUserRoles(data.roleIds)
    delete patch.roleIds
  }
  mockUsers[index] = { ...mockUsers[index], ...patch, updateTime: new Date().toLocaleString('zh-CN') }
  return true
}

/** 删除用户 */
export function deleteUserMock(id) {
  const index = mockUsers.findIndex((u) => u.id === id)
  if (index === -1) throw new Error('用户不存在')
  mockUsers.splice(index, 1)
  return true
}

/** 批量删除用户 */
export function batchDeleteUsersMock(ids = []) {
  ids.forEach((id) => {
    const index = mockUsers.findIndex((u) => u.id === id)
    if (index !== -1) mockUsers.splice(index, 1)
  })
  return true
}

/** 更新用户状态 */
export function updateUserStatusMock(id, status) {
  const index = mockUsers.findIndex((u) => u.id === id)
  if (index === -1) return false
  mockUsers[index].status = status
  mockUsers[index].updateTime = new Date().toLocaleString('zh-CN')
  return true
}

/** 移动用户到其他部门 */
export function moveUserMock(userId, departmentId) {
  const index = mockUsers.findIndex((u) => u.id === userId)
  if (index === -1) throw new Error('用户不存在')
  const dept = findDepartmentById(departmentId)
  mockUsers[index].departmentId = departmentId
  mockUsers[index].department = dept ? { id: dept.id, name: dept.name } : undefined
  mockUsers[index].updateTime = new Date().toLocaleString('zh-CN')
  return true
}
