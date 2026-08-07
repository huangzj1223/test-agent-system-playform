/**
 * 文件名称：api/modules/authApi.js - 认证相关 API
 *
 * 功能描述：
 *   封装用户认证相关的 API 接口
 *   包含登录、获取用户信息等接口
 *
 * 使用方式：
 *   import { loginApi, getUserInfoApi } from '@/api/modules/authApi'
 *   const res = await loginApi({ username, password })
 *
 * 主要功能：
 *   - 用户登录接口
 *   - 获取用户信息接口
 */

import request from '../request'

/**
 * 登录参数类型
 * @typedef {Object} LoginParams
 * @property {string} username - 用户名
 * @property {string} password - 密码
 */

/**
 * 用户登录
 * @param {LoginParams} data - 登录参数
 * @returns {Promise<Object>} 登录结果（包含 token 和用户信息）
 * @example
 * loginApi({ username: 'admin', password: '123456' })
 */
export const loginApi = (data) => {
  return request({
    url: '/login',
    method: 'post',
    data
  })
}

/**
 * 获取用户信息
 * @returns {Promise<Object>} 用户信息
 * @example
 * getUserInfoApi()
 */
export const getUserInfoApi = () => {
  return request({
    url: '/user/info',
    method: 'get'
  })
}
