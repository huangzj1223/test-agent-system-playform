/**
 * 文件名称：api/request.js - Axios 请求封装
 *
 * 功能描述：
 *   封装 Axios HTTP 客户端，提供统一的请求和响应处理
 *   包含请求拦截器、响应拦截器、错误处理等功能
 *
 * 使用方式：
 *   import request from '@/api/request'
 *   request.get('/api/users')
 *   request.post('/api/login', { username, password })
 *
 * 主要功能：
 *   - 统一的请求配置（baseURL、timeout、headers）
 *   - 自动添加 Token 到请求头
 *   - 统一的响应数据处理
 *   - 统一的错误提示和处理
 */

import axios from 'axios'
import { showToast } from 'vant'

/**
 * 通用响应接口类型定义
 * @typedef {Object} ApiResponse
 * @property {number} code - 响应码（200 表示成功）
 * @property {*} data - 响应数据
 * @property {string} message - 响应消息
 */

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // API 基础路径
  timeout: 10000, // 请求超时时间（10秒）
  headers: {
    'Content-Type': 'application/json' // 默认请求头
  }
})

/**
 * 请求拦截器
 * 在请求发送前执行，用于添加 Token、修改请求配置等
 */
request.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token 并添加到请求头
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    // 请求错误处理
    return Promise.reject(error)
  }
)

/**
 * 响应拦截器
 * 在响应返回后执行，用于统一处理响应数据和错误
 */
request.interceptors.response.use(
  (response) => {
    const { code, message } = response.data

    // 成功响应（code 为 200）
    if (code === 200) {
      return response.data
    }

    // 业务错误（code 不为 200）
    showToast(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    // 网络错误或 HTTP 状态码错误
    if (error.response) {
      const { status } = error.response
      // HTTP 状态码错误提示映射
      const errorMap = {
        401: '未授权，请重新登录',
        403: '拒绝访问',
        404: '请求的资源不存在',
        500: '服务器错误',
        502: '网关错误',
        503: '服务不可用'
      }
      showToast(errorMap[status] || '请求失败')
    } else {
      // 网络连接失败
      showToast('网络连接失败')
    }
    return Promise.reject(error)
  }
)

export default request
