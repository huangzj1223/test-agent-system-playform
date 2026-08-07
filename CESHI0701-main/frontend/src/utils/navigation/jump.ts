import { AppRouteRecord } from '@/types/router'
import { router } from '@/router'

// 打开外部链接
export const openExternalLink = (link: string) => {
  window.open(link, '_blank')
}

/**
 * 菜单跳转
 * @param item 菜单项
 * @param jumpToFirst 是否跳转到第一个子菜单
 * @returns
 */
export const handleMenuJump = (item: AppRouteRecord, jumpToFirst: boolean = false) => {
  // 处理新窗口打开
  if (item.meta?.openInNewWindow && item.meta?.newWindowPath) {
    // 拼接基础路径（兼容部署在子目录的场景，使用 BASE_URL）
    const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '')
    const fullUrl = baseUrl + item.meta.newWindowPath
    return window.open(fullUrl, '_blank')
  }

  // 处理外部链接
  const { link, isIframe } = item.meta || {}
  if (link && !isIframe) {
    return openExternalLink(link)
  }

  // 如果不需要跳转到第一个子菜单，或者没有子菜单，直接跳转当前路径
  if (!jumpToFirst || !item.children?.length) {
    return router.push(item.path)
  }

  // 递归查找第一个可见的叶子节点菜单
  const findFirstLeafMenu = (items: AppRouteRecord[], parentPath: string = ''): AppRouteRecord => {
    for (const child of items) {
      if (!child.meta?.isHide) {
        // 构建完整路径
        const fullPath = child.path.startsWith('/') ? child.path : `${parentPath}/${child.path}`
        if (child.children?.length) {
          return findFirstLeafMenu(child.children, fullPath)
        }
        // 返回带完整路径的子菜单
        return { ...child, path: fullPath }
      }
    }
    // 如果所有子菜单都隐藏，返回第一个（带完整路径）
    const firstItem = items[0]
    const fullPath = firstItem.path.startsWith('/')
      ? firstItem.path
      : `${parentPath}/${firstItem.path}`
    return { ...firstItem, path: fullPath }
  }

  const firstChild = findFirstLeafMenu(item.children, item.path)

  // 如果第一个子菜单是外部链接则打开新窗口
  if (firstChild.meta?.link) {
    return openExternalLink(firstChild.meta.link)
  }

  // 跳转到子菜单路径
  router.push(firstChild.path)
}
