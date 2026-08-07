/**
 * 文件名称：mock/modules/auth.js - 认证模块 Mock 数据
 *
 * 功能描述：
 *   模拟用户认证相关的接口数据
 *   包含登录接口和用户信息接口的 Mock 数据
 *
 * 使用方式：
 *   在 mock/index.js 中导入并注册
 *
 * 主要功能：
 *   - 模拟登录接口（返回 token 和用户信息）
 *   - 模拟获取用户信息接口
 */

import Mock from 'mockjs'

/**
 * 模拟登录接口
 * @param {Object} options - 请求参数
 * @returns {Object} Mock 响应数据
 */
export const login = (options) => {
  const { username, password } = JSON.parse(options.body)

  // 模拟登录验证（任意用户名密码都可以登录）
  if (username && password) {
    return Mock.mock({
      code: 200,
      message: '登录成功',
      data: {
        token: '@guid', // 生成随机 token
        userInfo: {
          id: '@id',
          name: username, // 使用登录的用户名
          phone: /^1[3-9]\d{9}$/,
          email: '@email',
          avatar: '@image("100x100", "@color", "#FFF", "@name")'
        }
      }
    })
  }

  // 登录失败
  return {
    code: 400,
    message: '用户名或密码不能为空',
    data: null
  }
}

/**
 * 模拟获取用户信息接口
 * @returns {Object} Mock 响应数据
 */
export const getUserInfo = () => {
  return Mock.mock({
    code: 200,
    message: '获取成功',
    data: {
      id: '@id',
      name: '@cname',
      phone: /^1[3-9]\d{9}$/,
      email: '@email',
      avatar: '@image("100x100", "@color", "#FFF", "@name")'
    }
  })
}
