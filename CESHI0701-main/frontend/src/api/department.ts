/**
 * 部门管理 API — 桥接 organization.ts
 */

import {
  getDepartmentTree,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  updateDepartmentStatus
} from './organization'

export type { Department } from '@/types/api'

export const departmentApi = {
  getTree: getDepartmentTree,
  add: addDepartment,
  update: updateDepartment,
  delete: deleteDepartment,
  updateStatus: updateDepartmentStatus
}
