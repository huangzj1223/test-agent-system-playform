/**
 * 文件名称：utils/storage.js - 本地存储工具函数
 *
 * 功能描述：
 *   封装 localStorage 操作，提供统一的本地存储接口
 *   包含 token、用户信息等数据的存储和读取
 *
 * 使用方式：
 *   import { getToken, setToken, removeToken } from '@/utils/storage'
 *   setToken('your-token')
 *   const token = getToken()
 *
 * 主要功能：
 *   - Token 管理（存储、读取、删除）
 *   - 用户信息管理（存储、读取、删除）
 *   - 通用存储方法（支持任意数据类型）
 */

// 存储键名常量
const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'

/**
 * 获取 Token
 * @returns {string|null} Token 字符串，不存在则返回 null
 * @example getToken() // 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 设置 Token
 * @param {string} token - Token 字符串
 * @example setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
 */
export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 删除 Token
 * @example removeToken()
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息对象，不存在则返回 null
 * @example getUserInfo() // { id: 1, name: '张三', avatar: '...' }
 */
export const getUserInfo = () => {
  const userInfo = localStorage.getItem(USER_INFO_KEY)
  if (!userInfo) return null

  try {
    return JSON.parse(userInfo)
  } catch (error) {
    console.error('解析用户信息失败：', error)
    return null
  }
}

/**
 * 设置用户信息
 * @param {Object} userInfo - 用户信息对象
 * @example setUserInfo({ id: 1, name: '张三', avatar: '...' })
 */
export const setUserInfo = (userInfo) => {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
}

/**
 * 删除用户信息
 * @example removeUserInfo()
 */
export const removeUserInfo = () => {
  localStorage.removeItem(USER_INFO_KEY)
}

/**
 * 清除所有本地存储数据
 * @example clearAll()
 */
export const clearAll = () => {
  localStorage.clear()
}

/**
 * 通用存储方法 - 存储任意数据
 * @param {string} key - 存储键名
 * @param {*} value - 存储值（会自动转换为 JSON）
 * @example setStorage('myData', { foo: 'bar' })
 */
export const setStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

/**
 * 通用读取方法 - 读取任意数据
 * @param {string} key - 存储键名
 * @returns {*} 存储的值（自动解析 JSON），不存在则返回 null
 * @example getStorage('myData') // { foo: 'bar' }
 */
export const getStorage = (key) => {
  const value = localStorage.getItem(key)
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch (error) {
    console.error(`解析存储数据失败 (${key}):`, error)
    return null
  }
}

/**
 * 通用删除方法 - 删除指定数据
 * @param {string} key - 存储键名
 * @example removeStorage('myData')
 */
export const removeStorage = (key) => {
  localStorage.removeItem(key)
}
