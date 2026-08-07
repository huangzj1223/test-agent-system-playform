/**
 * 文件名称：router/index.js - 路由配置文件
 *
 * 功能描述：
 *   Vue Router 路由配置，定义应用的所有路由规则
 *   包含路由守卫、页面缓存配置、底部导航栏显示控制等
 *
 * 主要功能：
 *   - 定义路由规则和页面映射
 *   - 配置路由 Meta 信息（标题、缓存、权限等）
 *   - 全局路由守卫（页面标题设置等）
 *   - KeepAlive 缓存控制
 *   - 底部导航栏显示控制
 */

import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/storage'

/**
 * 路由 Meta 信息类型定义
 * @typedef {Object} RouteMeta
 * @property {string} [title] - 页面标题
 * @property {boolean} [requiresAuth] - 是否需要登录
 * @property {boolean} [keepAlive] - 是否缓存页面（KeepAlive）
 * @property {boolean} [showTabbar] - 是否显示底部导航栏
 */

// 路由配置数组
const routes = [
  {
    path: '/',
    redirect: '/home' // 根路径重定向到首页
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'), // 登录页面
    meta: {
      title: '登录',
      requiresAuth: false, // 不需要登录
      keepAlive: false, // 不缓存
      showTabbar: false // 不显示底部导航栏
    }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/home/Home.vue'), // 路由懒加载
    meta: {
      title: '首页',
      requiresAuth: true, // 需要登录
      keepAlive: true, // 启用页面缓存
      showTabbar: true // 显示底部导航栏
    }
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: () => import('@/views/workspace/Workspace.vue'),
    meta: {
      title: '工作台',
      requiresAuth: true, // 需要登录
      keepAlive: true,
      showTabbar: true
    }
  },
  {
    path: '/message',
    name: 'Message',
    component: () => import('@/views/message/Message.vue'),
    meta: {
      title: '消息',
      requiresAuth: true, // 需要登录
      keepAlive: true,
      showTabbar: true
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/profile/Profile.vue'),
    meta: {
      title: '我的',
      requiresAuth: true, // 需要登录
      keepAlive: true,
      showTabbar: true
    }
  },
  {
    path: '/charts/demo',
    name: 'ChartsDemo',
    component: () => import('@/views/charts/ChartsDemo.vue'),
    meta: {
      title: '图表组件',
      requiresAuth: true, // 需要登录
      keepAlive: false, // 不缓存
      showTabbar: false // 不显示底部导航栏
    }
  },
  {
    path: '/components/form',
    name: 'FormComponents',
    component: () => import('@/views/components/FormComponents.vue'),
    meta: {
      title: '表单组件',
      requiresAuth: true, // 需要登录
      keepAlive: false, // 不缓存
      showTabbar: false // 不显示底部导航栏
    }
  },
  {
    path: '/components/detail',
    name: 'DetailComponents',
    component: () => import('@/views/components/DetailComponents.vue'),
    meta: {
      title: '详情组件',
      requiresAuth: true, // 需要登录
      keepAlive: false, // 不缓存
      showTabbar: false // 不显示底部导航栏
    }
  },
  {
    path: '/components/list',
    name: 'ListComponents',
    component: () => import('@/views/components/ListComponents.vue'),
    meta: {
      title: '列表组件',
      requiresAuth: true, // 需要登录
      keepAlive: false, // 不缓存
      showTabbar: false // 不显示底部导航栏
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(), // 使用 HTML5 History 模式
  routes
})

/**
 * 全局前置守卫
 * 在每次路由跳转前执行，用于设置页面标题、权限验证等
 */
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || 'H5应用'

  // 获取 token
  const token = getToken()

  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    // 需要登录但未登录，跳转到登录页
    if (!token) {
      next({
        path: '/login',
        query: { redirect: to.fullPath } // 保存目标路径，登录后跳转
      })
      return
    }
  } else {
    // 不需要登录的页面，如果已登录且访问登录页，跳转到首页
    if (to.path === '/login' && token) {
      next('/home')
      return
    }
  }

  // 继续路由跳转
  next()
})

export default router
