import request from '@/utils/http'
import type { AppRouteRecord } from '@/types/router'

/**
 * 登录
 */
export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/admin/open/login',
    data: params
  })
}

/**
 * 获取当前用户信息
 */
export function fetchGetUserInfo() {
  return request.get<Api.Auth.UserInfo>({
    url: '/admin/open/person'
  })
}

/**
 * 刷新 token
 */
export function fetchRefreshToken(refreshToken: string) {
  return request.post<{ token: string; expire: number }>({
    url: '/admin/open/refreshToken',
    data: { refreshToken }
  })
}

/**
 * 退出登录
 * 跳过 401 统一处理：退出是终态操作，其 401 不应重入 logOut 或弹错。
 * 显式带 token 作为防御性兜底——确保即使调用方已清空本地状态、请求拦截器读不到 token 时，
 * 退出请求仍能携带凭证让后端正常清理 Redis token。
 * @param token 当前访问令牌（调用方传入）
 */
export function fetchLogout(token?: string) {
  return request.post({
    url: '/admin/open/logout',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    skipAuthHandler: true
  })
}

/**
 * 获取权限列表
 */
export function fetchPerms() {
  return request.get<string[]>({
    url: '/admin/open/perms'
  })
}

/**
 * 获取当前用户菜单树（后端菜单模式）
 * 返回按角色过滤的前端路由树（AppRouteRecord 形态），用于动态路由注册与侧边栏渲染
 */
export function fetchGetMenuList() {
  return request.get<AppRouteRecord[]>({
    url: '/admin/open/permmenu'
  })
}
