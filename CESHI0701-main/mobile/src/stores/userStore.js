/**
 * 文件名称：stores/userStore.js - 用户状态管理
 *
 * 功能描述：
 *   Pinia Store，管理用户的登录状态和用户信息
 *   包含登录、登出、获取用户信息等功能
 *
 * 使用方式：
 *   import { useUserStore } from '@/stores/userStore'
 *   const userStore = useUserStore()
 *   await userStore.login(username, password)
 *
 * 主要功能：
 *   - 用户登录状态管理
 *   - 用户信息管理
 *   - Token 管理
 *   - 登录/登出操作
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getToken,
  setToken,
  removeToken,
  getUserInfo,
  setUserInfo,
  removeUserInfo
} from '@/utils/storage'
import { loginApi, getUserInfoApi } from '@/api/modules/authApi'

/**
 * 用户信息类型定义
 * @typedef {Object} UserInfo
 * @property {number|string} id - 用户ID
 * @property {string} name - 用户名
 * @property {string} phone - 手机号
 * @property {string} email - 邮箱
 * @property {string} avatar - 头像URL
 */

export const useUserStore = defineStore('user', () => {
  // ========== State（状态） ==========

  /** Token @type {import('vue').Ref<string>} */
  const token = ref(getToken() || '')

  /** 用户信息 @type {import('vue').Ref<UserInfo|null>} */
  const userInfo = ref(getUserInfo() || null)

  /** 登录状态 @type {import('vue').Ref<boolean>} */
  const isLogin = ref(!!token.value)

  // ========== Getters（计算属性） ==========

  /** 用户ID */
  const userId = computed(() => userInfo.value?.id || '')

  /** 用户名 */
  const userName = computed(() => userInfo.value?.name || '未登录')

  /** 用户头像 */
  const userAvatar = computed(() => userInfo.value?.avatar || '')

  /** 用户手机号 */
  const userPhone = computed(() => userInfo.value?.phone || '')

  /** 用户邮箱 */
  const userEmail = computed(() => userInfo.value?.email || '')

  // ========== Actions（方法） ==========

  /**
   * 设置 Token
   * @param {string} newToken - 新的 token
   */
  const setTokenValue = (newToken) => {
    token.value = newToken
    setToken(newToken)
    isLogin.value = true
  }

  /**
   * 设置用户信息
   * @param {UserInfo} info - 用户信息
   */
  const setUserInfoValue = (info) => {
    userInfo.value = info
    setUserInfo(info)
  }

  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  const login = async (username, password) => {
    try {
      const res = await loginApi({ username, password })
      if (res.code === 200) {
        // 保存 token
        setTokenValue(res.data.token)
        // 保存用户信息
        setUserInfoValue(res.data.userInfo)
      }
      return res
    } catch (error) {
      console.error('登录失败：', error)
      throw error
    }
  }

  /**
   * 获取用户信息
   * @returns {Promise<Object>} 用户信息
   */
  const fetchUserInfo = async () => {
    try {
      const res = await getUserInfoApi()
      if (res.code === 200) {
        setUserInfoValue(res.data)
      }
      return res
    } catch (error) {
      console.error('获取用户信息失败：', error)
      throw error
    }
  }

  /**
   * 用户登出
   */
  const logout = () => {
    // 清除 token
    token.value = ''
    removeToken()

    // 清除用户信息
    userInfo.value = null
    removeUserInfo()

    // 更新登录状态
    isLogin.value = false
  }

  // 返回 Store 的公共接口
  return {
    // State
    token,
    userInfo,
    isLogin,
    // Getters
    userId,
    userName,
    userAvatar,
    userPhone,
    userEmail,
    // Actions
    setTokenValue,
    setUserInfoValue,
    login,
    logout,
    fetchUserInfo
  }
})
