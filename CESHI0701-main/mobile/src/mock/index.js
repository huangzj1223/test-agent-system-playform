/**
 * 文件名称：mock/index.js - Mock 数据配置
 *
 * 功能描述：
 *   Mock.js 数据模拟配置，用于开发环境模拟后端接口
 *   无需真实后端即可进行前端开发和测试
 *
 * 使用方式：
 *   在 main.js 中导入即可自动拦截 API 请求
 *   import '@/mock'
 *
 * 主要功能：
 *   - 配置 Mock 延迟时间
 *   - 定义模拟接口和响应数据
 *   - 使用 Mock.js 语法生成随机数据
 */

import Mock from 'mockjs'
import { login, getUserInfo } from './modules/auth'

// 配置 Mock
Mock.setup({
  timeout: '200-600' // 模拟网络延迟（200-600ms）
})

/**
 * 认证相关接口
 */
// 登录接口：POST /api/login
Mock.mock(/\/api\/login/, 'post', login)

// 获取用户信息接口：GET /api/user/info
Mock.mock(/\/api\/user\/info/, 'get', getUserInfo)

export default Mock
