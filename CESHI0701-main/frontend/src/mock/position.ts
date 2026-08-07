// @ts-nocheck
/**
 * 岗位管理 Mock 数据
 * 字段与岗位管理页面一致：name/description/orderNum/createTime
 * 列表返回 { list, pagination: { page, pageSize, total } }
 */

// ==================== 岗位数据 ====================
export const mockPositions = [
  { id: 1, name: '总经理', description: '负责公司整体经营管理', orderNum: 1, status: 1, createTime: '2024-01-01 10:00:00', updateTime: '2025-03-01 09:00:00' },
  { id: 2, name: '分公司经理', description: '负责分公司日常运营管理', orderNum: 2, status: 1, createTime: '2024-01-01 10:00:00', updateTime: '2025-03-01 09:00:00' },
  { id: 3, name: '部门经理', description: '负责本部门业务与团队管理', orderNum: 3, status: 1, createTime: '2024-01-01 10:00:00', updateTime: '2025-03-01 09:00:00' },
  { id: 4, name: '员工', description: '执行具体业务工作', orderNum: 4, status: 1, createTime: '2024-01-01 10:00:00', updateTime: '2025-03-01 09:00:00' }
]

let nextPositionId = 10

// ==================== 岗位 Mock 函数 ====================

/** 获取岗位列表（分页） */
export function getPositionListMock(params = {}) {
  const { keyword, status, page = 1, pageSize = 100 } = params || {}
  let filtered = [...mockPositions]
  if (keyword) {
    filtered = filtered.filter((p) => p.name.includes(keyword))
  }
  if (status !== undefined && status !== null && status !== '') {
    const statusValue = typeof status === 'string' ? parseInt(status) : status
    filtered = filtered.filter((p) => p.status === statusValue)
  }
  const start = (page - 1) * pageSize
  const list = filtered.slice(start, start + Number(pageSize))
  return { list, pagination: { page: Number(page), pageSize: Number(pageSize), total: filtered.length } }
}

/** 新增岗位 */
export function addPositionMock(data) {
  const newPosition = {
    id: nextPositionId++,
    name: data.name || '',
    description: data.description || '',
    orderNum: data.orderNum || 1,
    status: data.status ?? 1,
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN')
  }
  mockPositions.push(newPosition)
  return newPosition
}

/** 更新岗位 */
export function updatePositionMock(id, data) {
  const index = mockPositions.findIndex((p) => p.id === id)
  if (index === -1) return false
  mockPositions[index] = { ...mockPositions[index], ...data, updateTime: new Date().toLocaleString('zh-CN') }
  return true
}

/** 删除岗位 */
export function deletePositionMock(id) {
  const index = mockPositions.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('岗位不存在')
  mockPositions.splice(index, 1)
  return true
}
