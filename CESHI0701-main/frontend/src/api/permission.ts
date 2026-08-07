import request from '@/utils/http'

/**
 * 获取角色列表（分页）
 */
export function getRoleList(params?: {
  keyword?: string
  status?: number | string
  page?: number
  pageSize?: number
}) {
  return request.get<{ list: any[]; pagination: { page: number; pageSize: number; total: number } }>({
    url: '/admin/sys/role/list',
    params
  })
}

/**
 * 获取角色详情
 */
export function getRoleDetail(id: number) {
  return request.get({
    url: `/admin/sys/role/detail/${id}`
  })
}

/**
 * 新增角色
 */
export function addRole(data: {
  name: string
  label?: string
  remark?: string
  status?: number
}) {
  return request.post({
    url: '/admin/sys/role/add',
    data
  })
}

/**
 * 更新角色
 */
export function updateRole(data: {
  id: number
  name?: string
  label?: string
  remark?: string
  status?: number
}) {
  return request.put({
    url: '/admin/sys/role/update',
    data
  })
}

/**
 * 删除角色
 */
export function deleteRole(id: number) {
  return request.del({
    url: `/admin/sys/role/delete/${id}`
  })
}

/**
 * 批量删除角色
 */
export function batchDeleteRoles(ids: number[]) {
  return request.post({
    url: '/admin/sys/role/batch-delete',
    data: { ids }
  })
}

/**
 * 更新角色状态
 */
export function updateRoleStatus(id: number, status: number) {
  return request.put({
    url: '/admin/sys/role/update-status',
    data: { id, status }
  })
}

/**
 * 获取角色菜单权限
 */
export function getRoleMenus(id: number) {
  return request.get<number[]>({
    url: `/admin/sys/role/getMenus/${id}`
  })
}

/**
 * 设置角色菜单权限
 */
export function setRoleMenus(roleId: number, menuIds: number[]) {
  return request.post({
    url: '/admin/sys/role/setMenus',
    data: { roleId, menuIds }
  })
}

/**
 * 获取菜单树
 */
export function getMenuTree() {
  return request.get<any[]>({
    url: '/admin/sys/menu/tree'
  })
}

/**
 * 获取菜单列表（分页）
 */
export function getMenuList(params?: {
  keyword?: string
  type?: number
  parentId?: number
  page?: number
  pageSize?: number
}) {
  return request.get({
    url: '/admin/sys/menu/list',
    params
  })
}

/**
 * 新增菜单
 */
export function addMenu(data: {
  parentId?: number
  name: string
  router?: string
  perms?: string
  type: number
  icon?: string
  orderNum?: number
  viewPath?: string
  keepAlive?: number
  isShow?: number
}) {
  return request.post({
    url: '/admin/sys/menu/add',
    data
  })
}

/**
 * 更新菜单
 */
export function updateMenu(data: {
  id: number
  parentId?: number
  name?: string
  router?: string
  perms?: string
  type?: number
  icon?: string
  orderNum?: number
  viewPath?: string
  keepAlive?: number
  isShow?: number
}) {
  return request.put({
    url: '/admin/sys/menu/update',
    data
  })
}

/**
 * 删除菜单
 */
export function deleteMenu(id: number) {
  return request.del({
    url: `/admin/sys/menu/delete/${id}`
  })
}

/**
 * 更新菜单状态（显示/隐藏）
 */
export function updateMenuStatus(id: number, isShow: number) {
  return request.put({
    url: '/admin/sys/menu/update-status',
    data: { id, status: isShow }
  })
}
