/**
 * 文件名称：stores/appStore.js - 应用全局状态管理
 *
 * 功能描述：
 *   Pinia Store，管理应用的全局状态
 *   包含应用配置、加载状态等全局数据
 *
 * 使用方式：
 *   import { useAppStore } from '@/stores/appStore'
 *   const appStore = useAppStore()
 *   appStore.setLoading(true)
 *
 * 主要功能：
 *   - 应用配置管理（标题、版本、主题）
 *   - 全局加载状态管理
 *   - 配置更新方法
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 应用配置类型定义
 * @typedef {Object} AppConfig
 * @property {string} title - 应用标题
 * @property {string} version - 应用版本
 * @property {string} theme - 主题色
 */

export const useAppStore = defineStore('app', () => {
  // ========== State（状态） ==========

  /** 应用配置 @type {import('vue').Ref<AppConfig>} */
  const config = ref({
    title: 'H5产品经理原型AI框架',
    version: '1.0.0',
    theme: '#1171F8'
  })

  /** 全局加载状态 @type {import('vue').Ref<boolean>} */
  const loading = ref(false)

  // ========== Getters（计算属性） ==========

  /** 应用标题 */
  const appTitle = computed(() => config.value.title)

  /** 应用版本 */
  const appVersion = computed(() => config.value.version)

  // ========== Actions（方法） ==========

  /**
   * 设置全局加载状态
   * @param {boolean} status - 加载状态（true 显示加载，false 隐藏加载）
   */
  const setLoading = (status) => {
    loading.value = status
  }

  /**
   * 更新应用配置
   * @param {Partial<AppConfig>} newConfig - 新配置（部分更新）
   */
  const updateConfig = (newConfig) => {
    config.value = { ...config.value, ...newConfig }
  }

  // 返回 Store 的公共接口
  return {
    // State
    config,
    loading,
    // Getters
    appTitle,
    appVersion,
    // Actions
    setLoading,
    updateConfig
  }
})
