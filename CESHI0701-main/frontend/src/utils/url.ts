/**
 * 资源 URL 处理工具
 * @description 统一处理后端返回的图片/文件路径
 */

/**
 * 获取完整的资源 URL
 * @param path 路径（支持相对路径、完整 URL、undefined）
 * @returns 完整 URL 或 undefined
 */
export function getAssetUrl(path: string | undefined): string | undefined {
  // 1. 空值处理
  if (!path) return undefined

  // 2. 已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // 3. 相对路径，拼接 base URL
  const baseUrl = import.meta.env.VITE_API_PROXY_URL || ''
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`
}

/**
 * 获取用户头像 URL
 * @param avatar 头像路径
 * @returns 完整头像 URL 或 undefined
 */
export function getAvatarUrl(avatar: string | undefined): string | undefined {
  return getAssetUrl(avatar)
}
