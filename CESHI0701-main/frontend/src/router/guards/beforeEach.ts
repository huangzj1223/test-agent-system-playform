import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { ref, nextTick } from 'vue'
import NProgress from 'nprogress'
import { useSettingStore } from '@/store/modules/setting'
import { useUserStore } from '@/store/modules/user'
import { useMenuStore } from '@/store/modules/menu'
import { setWorktab } from '@/utils/navigation'
import { setPageTitle } from '../utils/utils'
import { registerDynamicRoutes } from '../utils/registerRoutes'
import { AppRouteRecord } from '@/types/router'
import { RoutesAlias } from '../routesAlias'
import { menuDataToRouter } from '../utils/menuToRouter'
import { asyncRoutes } from '../routes/asyncRoutes'
import { staticRoutes } from '../routes/staticRoutes'
import { loadingService } from '@/utils/ui'
import { useCommon } from '@/composables/useCommon'
import { useWorktabStore } from '@/store/modules/worktab'
import { fetchGetUserInfo, fetchGetMenuList } from '@/api/auth'
import { ApiStatus } from '@/utils/http/status'
import { HttpError, isHttpError } from '@/utils/http/error'

// 是否已注册动态路由
const isRouteRegistered = ref(false)

// 跟踪是否需要关闭 loading
const pendingLoading = ref(false)

/**
 * 从已注册的路由中构建菜单树
 * 用于 Mock 模式，从 router.getRoutes() 获取完整路径的路由
 */
function buildMenuTreeFromRoutes(router: Router): AppRouteRecord[] {
  const allRoutes = router.getRoutes()

  // 静态路由名称列表（不应出现在菜单中的路由）
  const staticRouteNames = ['Login', 'Exception403', 'Exception404', 'Exception500']

  // 过滤出顶层菜单路由（排除静态路由和根路径）
  const topLevelRoutes = allRoutes.filter((route) => {
    // 排除静态路由
    if (route.name && staticRouteNames.includes(route.name as string)) {
      return false
    }
    // 排除根路径
    if (route.path === '/') {
      return false
    }
    // 只保留顶层路由（路径以 / 开头且没有父路由，或者是直接子路由）
    const pathSegments = route.path.split('/').filter(Boolean)
    return pathSegments.length === 1
  })

  // 构建路由树结构
  const menuTree: AppRouteRecord[] = []

  for (const route of topLevelRoutes) {
    const menuItem = buildMenuItemFromRoute(route, allRoutes)
    if (menuItem) {
      menuTree.push(menuItem)
    }
  }

  return menuTree
}

/**
 * 从路由记录构建菜单项
 */
function buildMenuItemFromRoute(route: any, allRoutes: any[]): AppRouteRecord | null {
  // 构建基本菜单项
  const menuItem: AppRouteRecord = {
    path: route.path,
    name: route.name,
    component: route.components?.default,
    meta: route.meta || {}
  }

  // 查找子路由
  const children = allRoutes.filter((r) => {
    // 子路由的路径应该以父路径开头，且比父路径多一层
    if (!r.path.startsWith(route.path + '/')) {
      return false
    }
    const relativePath = r.path.substring(route.path.length + 1)
    // 只取直接子路由（不包含更深层的路由）
    return !relativePath.includes('/')
  })

  if (children.length > 0) {
    menuItem.children = children
      .map((child) => buildMenuItemFromRoute(child, allRoutes))
      .filter(Boolean) as AppRouteRecord[]
  }

  return menuItem
}

/**
 * 设置路由全局前置守卫
 */
export function setupBeforeEachGuard(router: Router): void {
  router.beforeEach(
    async (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext
    ) => {
      try {
        await handleRouteGuard(to, from, next, router)
      } catch (error) {
        // 401 错误已由 HTTP 拦截器处理（跳转登录），取消当前导航即可
        if (isUnauthorizedError(error)) {
          next(false)
          return
        }
        // 其他错误跳转 500 页面
        next({ name: 'Exception500' })
      }
    }
  )

  // 设置后置守卫以关闭 loading 和进度条
  setupAfterEachGuard(router)
}

/**
 * 设置路由全局后置守卫
 */
function setupAfterEachGuard(router: Router): void {
  router.afterEach(() => {
    // 关闭进度条
    const settingStore = useSettingStore()
    if (settingStore.showNprogress) {
      NProgress.done()
    }

    // 关闭 loading 效果
    if (pendingLoading.value) {
      nextTick(() => {
        loadingService.hideLoading()
        pendingLoading.value = false
      })
    }
  })
}

/**
 * 处理路由守卫逻辑
 */
async function handleRouteGuard(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  router: Router
): Promise<void> {
  const settingStore = useSettingStore()
  const userStore = useUserStore()

  // 处理进度条
  if (settingStore.showNprogress) {
    NProgress.start()
  }

  // 处理登录状态
  if (!(await handleLoginStatus(to, userStore, next))) {
    return
  }

  // Mock 模式：禁用动态路由注册，使用静态路由
  // 所有路由已在 asyncRoutes 中静态配置，无需动态加载
  const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
  if (USE_MOCK && !isRouteRegistered.value) {
    // 标记路由已注册（跳过动态路由逻辑）
    isRouteRegistered.value = true

    // 设置菜单数据（从已注册的路由构建，确保路径完整）
    const menuStore = useMenuStore()
    const menuTree = buildMenuTreeFromRoutes(router)
    menuStore.setMenuList(menuTree)
  }

  // 处理动态路由注册（Mock 模式下跳过）
  if (!isRouteRegistered.value && userStore.isLogin && !USE_MOCK) {
    await handleDynamicRoutes(to, from, next, router)
    return
  }

  // 处理根路径跳转到首页
  if (userStore.isLogin && isRouteRegistered.value && handleRootPathRedirect(to, next)) {
    return
  }

  // 处理已知的匹配路由
  if (to.matched.length > 0) {
    setWorktab(to)
    setPageTitle(to)
    next()
    return
  }

  // 未匹配到路由，跳转到 404
  next({ name: 'Exception404' })
}

/**
 * 处理登录状态
 */
async function handleLoginStatus(
  to: RouteLocationNormalized,
  userStore: ReturnType<typeof useUserStore>,
  next: NavigationGuardNext
): Promise<boolean> {
  // 检查是否为静态路由（通过路由 name 判断）
  const isStaticRoute = isRouteInStaticRoutes(to.path)

  // 未登录时的处理
  if (!userStore.isLogin) {
    // 如果访问的是登录页或其他静态路由（403、404、500等），允许访问
    if (to.path === RoutesAlias.Login || isStaticRoute) {
      next()
      return false
    }
    // 其他所有路由（包括根路径 /）都跳转到登录页
    userStore.logOut()
    next({ name: 'Login' })
    return false
  }

  // 已登录时，如果访问登录页，跳转到首页（动态取第一个菜单路径）
  if (userStore.isLogin && to.path === RoutesAlias.Login) {
    const { homePath } = useCommon()
    next({ path: homePath.value || '/', replace: true })
    return false
  }

  return true
}

/**
 * 检查路由是否为静态路由
 */
function isRouteInStaticRoutes(path: string): boolean {
  const checkRoute = (routes: any[], targetPath: string): boolean => {
    return routes.some((route) => {
      // 处理动态路由参数匹配
      const routePath = route.path
      const pattern = routePath.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)

      if (regex.test(targetPath)) {
        return true
      }
      if (route.children && route.children.length > 0) {
        return checkRoute(route.children, targetPath)
      }
      return false
    })
  }

  return checkRoute(staticRoutes, path)
}

/**
 * 处理动态路由注册
 */
async function handleDynamicRoutes(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
  router: Router
): Promise<void> {
  // 显示 loading 并标记 pending
  pendingLoading.value = true
  loadingService.showLoading()

  try {
    // 获取用户信息
    await fetchUserInfoIfNeeded(from)

    // 获取菜单数据并注册路由
    await getMenuData(router)

    // 处理根路径跳转
    if (handleRootPathRedirect(to, next)) {
      return
    }

    next({
      path: to.path,
      query: to.query,
      hash: to.hash,
      replace: true
    })
  } catch (error) {
    // 401 错误：axios 拦截器已处理退出登录，取消当前导航即可
    if (isUnauthorizedError(error)) {
      next(false)
      return
    }

    // 403 错误：账号无可访问菜单，跳无权限页（区别于服务器错误）
    if (isForbiddenError(error)) {
      isRouteRegistered.value = true
      next({ name: 'Exception403' })
      return
    }

    // 其他错误：标记路由已注册（避免无限重试）
    isRouteRegistered.value = true
    next({ name: 'Exception500' })
  }
}

/**
 * 获取菜单数据
 */
async function getMenuData(router: Router): Promise<void> {
  if (useCommon().isFrontendMode.value) {
    await processFrontendMenu(router)
  } else {
    await processBackendMenu(router)
  }
}

/**
 * 处理前端控制模式的菜单逻辑
 */
async function processFrontendMenu(router: Router): Promise<void> {
  const menuList = asyncRoutes.map((route) => menuDataToRouter(route))
  const userStore = useUserStore()
  const userRoles = userStore.info.userRoles

  // 如果没有角色信息，显示所有菜单（超级管理员或角色未配置时）
  const roles = userRoles?.map((ur: { role: { id: number; name: string; label: string | null } }) => ur.role.name) ?? []

  const filteredMenuList = filterMenuByRoles(menuList, roles)

  await registerAndStoreMenu(router, filteredMenuList)
}

/**
 * 处理后端控制模式的菜单逻辑
 * 调 /admin/open/permmenu 拿当前用户的菜单树（已按角色过滤），转路由后注册。
 * 菜单为空表示该账号未分配任何可访问菜单，抛 403（区别于接口异常的 500）。
 */
async function processBackendMenu(router: Router): Promise<void> {
  const { data: menuList } = await fetchGetMenuList()
  if (!menuList || menuList.length === 0) {
    throw new HttpError('当前账号无可访问菜单，请联系管理员', ApiStatus.forbidden)
  }
  const routes = menuList.map((route) => menuDataToRouter(route))
  await registerAndStoreMenu(router, routes)
}

/**
 * 递归过滤空菜单项
 */
function filterEmptyMenus(menuList: AppRouteRecord[]): AppRouteRecord[] {
  return menuList
    .map((item) => {
      // 如果有子菜单，先递归过滤子菜单
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterEmptyMenus(item.children)
        return {
          ...item,
          children: filteredChildren
        }
      }
      return item
    })
    .filter((item) => {
      // 如果定义了 children 属性（即使是空数组），说明这是一个目录菜单，应该保留
      if ('children' in item) {
        return true
      }

      // 如果有外链或 iframe，保留
      if (item.meta?.isIframe === true || item.meta?.link) {
        return true
      }

      // 如果有有效的 component，保留
      if (item.component && item.component !== '' && item.component !== RoutesAlias.Layout) {
        return true
      }

      // 其他情况过滤掉
      return false
    })
}

/**
 * 注册路由并存储菜单数据
 */
async function registerAndStoreMenu(router: Router, menuList: AppRouteRecord[]): Promise<void> {
  if (!isValidMenuList(menuList)) {
    throw new Error('获取菜单列表失败，请重新登录')
  }
  const menuStore = useMenuStore()
  // 递归过滤掉为空的菜单项
  const list = filterEmptyMenus(menuList)
  menuStore.setMenuList(list)
  registerDynamicRoutes(router, list)
  isRouteRegistered.value = true
  useWorktabStore().validateWorktabs(router)
}

/**
 * 根据角色过滤菜单
 */
const filterMenuByRoles = (menu: AppRouteRecord[], roles: string[]): AppRouteRecord[] => {
  return menu.reduce((acc: AppRouteRecord[], item) => {
    const itemRoles = item.meta?.roles
    const hasPermission = !itemRoles || itemRoles.some((role) => roles?.includes(role))

    if (hasPermission) {
      const filteredItem = { ...item }
      if (filteredItem.children?.length) {
        filteredItem.children = filterMenuByRoles(filteredItem.children, roles)
      }
      acc.push(filteredItem)
    }

    return acc
  }, [])
}

/**
 * 验证菜单列表是否有效
 */
function isValidMenuList(menuList: AppRouteRecord[]): boolean {
  return Array.isArray(menuList) && menuList.length > 0
}

/**
 * 重置路由相关状态
 */
export function resetRouterState(): void {
  isRouteRegistered.value = false
  const menuStore = useMenuStore()
  menuStore.removeAllDynamicRoutes()
  menuStore.setMenuList([])
}

/**
 * 处理根路径跳转到首页（动态取第一个菜单路径）
 */
function handleRootPathRedirect(to: RouteLocationNormalized, next: NavigationGuardNext): boolean {
  if (to.path === '/') {
    const { homePath } = useCommon()
    if (homePath.value && homePath.value !== '/') {
      next({ path: homePath.value, replace: true })
      return true
    }
  }
  return false
}

/**
 * 获取用户信息（如果需要）
 */
async function fetchUserInfoIfNeeded(from: RouteLocationNormalized): Promise<void> {
  const userStore = useUserStore()
  const isRefresh = from.path === '/'
  const needFetch = isRefresh || !userStore.info || Object.keys(userStore.info).length === 0

  if (needFetch) {
    const { data } = await fetchGetUserInfo()
    if (data) {
      userStore.setUserInfo(data)
    }
  }
}

/**
 * 判断是否为未授权错误（401）
 */
function isUnauthorizedError(error: unknown): error is HttpError {
  return isHttpError(error) && error.code === ApiStatus.unauthorized
}

function isForbiddenError(error: unknown): error is HttpError {
  return isHttpError(error) && error.code === ApiStatus.forbidden
}
