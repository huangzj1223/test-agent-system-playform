import request from '@/utils/http'

// ==================== 部门管理 ====================

/**
 * 获取部门树
 */
export function getDepartmentTree() {
  return request.get<any[]>({
    url: '/admin/sys/department/tree'
  })
}

/**
 * 获取部门列表（分页）
 */
export function getDepartmentList(params?: {
  keyword?: string
  status?: number
  page?: number
  pageSize?: number
}) {
  return request.get({
    url: '/admin/sys/department/list',
    params
  })
}

/**
 * 新增部门
 */
export function addDepartment(data: {
  name: string
  parentId?: number | null
  type?: string
  leader?: string
  phone?: string
  orderNum?: number
}) {
  return request.post({
    url: '/admin/sys/department/add',
    data
  })
}

/**
 * 更新部门
 */
export function updateDepartment(data: {
  id: number
  name?: string
  parentId?: number | null
  type?: string
  leader?: string
  phone?: string
  orderNum?: number
}) {
  return request.put({
    url: '/admin/sys/department/update',
    data
  })
}

/**
 * 删除部门
 */
export function deleteDepartment(id: number) {
  return request.del({
    url: `/admin/sys/department/delete/${id}`
  })
}

/**
 * 更新部门状态
 */
export function updateDepartmentStatus(id: number, status: number) {
  return request.put({
    url: '/admin/sys/department/update-status',
    data: { id, status }
  })
}

// ==================== 用户管理 ====================

/**
 * 获取用户列表（分页）
 */
export function getUserList(params?: {
  keyword?: string
  status?: number
  departmentId?: number
  page?: number
  pageSize?: number
}) {
  return request.get<{ list: any[]; pagination: { page: number; pageSize: number; total: number } }>({
    url: '/admin/sys/user/list',
    params
  })
}

/**
 * 获取用户详情
 */
export function getUserDetail(id: number) {
  return request.get({
    url: `/admin/sys/user/detail/${id}`
  })
}

/**
 * 新增用户
 */
export function addUser(data: {
  username: string
  password: string
  name?: string
  nickName?: string
  phone?: string
  email?: string
  departmentId?: number
  positionId?: number
  roleIds?: number[]
}) {
  return request.post({
    url: '/admin/sys/user/add',
    data
  })
}

/**
 * 更新用户
 */
export function updateUser(data: {
  id: number
  name?: string
  nickName?: string
  phone?: string
  email?: string
  departmentId?: number
  positionId?: number
  roleIds?: number[]
  remark?: string
}) {
  return request.put({
    url: '/admin/sys/user/update',
    data
  })
}

/**
 * 删除用户
 */
export function deleteUser(id: number) {
  return request.del({
    url: `/admin/sys/user/delete/${id}`
  })
}

/**
 * 批量删除用户
 */
export function batchDeleteUsers(ids: number[]) {
  return request.post({
    url: '/admin/sys/user/batch-delete',
    data: { ids }
  })
}

/**
 * 更新用户状态
 */
export function updateUserStatus(id: number, status: number) {
  return request.put({
    url: '/admin/sys/user/update-status',
    data: { id, status }
  })
}

/**
 * 移动用户到其他部门
 */
export function moveUser(userId: number, departmentId: number) {
  return request.post({
    url: '/admin/sys/user/move',
    data: { userId, departmentId }
  })
}

// ==================== 岗位管理 ====================

/**
 * 获取岗位列表
 */
export function getPositionList(params?: {
  keyword?: string
  status?: number
  page?: number
  pageSize?: number
}) {
  return request.get<{ list: any[]; pagination: { page: number; pageSize: number; total: number } }>({
    url: '/admin/sys/position/list',
    params
  })
}

/**
 * 新增岗位
 */
export function addPosition(data: {
  name: string
  description?: string
  orderNum?: number
  status?: number
}) {
  return request.post({
    url: '/admin/sys/position/add',
    data
  })
}

/**
 * 更新岗位
 */
export function updatePosition(data: {
  id: number
  name?: string
  description?: string
  orderNum?: number
  status?: number
}) {
  return request.put({
    url: '/admin/sys/position/update',
    data
  })
}

/**
 * 删除岗位
 */
export function deletePosition(id: number) {
  return request.del({
    url: `/admin/sys/position/delete/${id}`
  })
}
