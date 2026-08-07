/**
 * 用户管理 API — 桥接 organization.ts
 */

import {
  getUserList,
  addUser,
  updateUser,
  deleteUser,
  batchDeleteUsers,
  updateUserStatus
} from './organization'

export type { AdminUser } from '@/types/api'

export const userApi = {
  getList: getUserList,
  add: addUser,
  update: updateUser,
  delete: deleteUser,
  batchDelete: batchDeleteUsers,
  updateStatus: updateUserStatus
}
