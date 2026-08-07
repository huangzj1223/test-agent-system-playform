import axios, { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/store/modules/user'
import { ApiStatus } from './status'
import { HttpError, handleError, showError, showSuccess } from './error'
import { $t } from '@/locales'
import { matchMock } from './mockRegistry'

/** 请求配置常量 */
const REQUEST_TIMEOUT = 15000
const LOGOUT_DELAY = 500
const MAX_RETRIES = 0
const RETRY_DELAY = 1000
const UNAUTHORIZED_DEBOUNCE_TIME = 3000
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** 401防抖状态 */
let isUnauthorizedErrorShown = false
let unauthorizedTimer: NodeJS.Timeout | null = null

/** 扩展 AxiosRequestConfig */
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean
  showSuccessMessage?: boolean
  timeout?: number // 允许覆盖默认超时时间（用于大文件上传）
  skipResponseValidation?: boolean // 跳过标准响应验证（用于原始响应如 GeoJSON）
  skipAuthHandler?: boolean // 跳过 401 统一处理（用于退出登录等终态请求，避免重入 logOut 与重复弹错）
}

const { VITE_API_URL, VITE_WITH_CREDENTIALS } = import.meta.env

/** Axios实例 */
const axiosInstance = axios.create({
  timeout: REQUEST_TIMEOUT,
  baseURL: VITE_API_URL,
  withCredentials: VITE_WITH_CREDENTIALS === 'true',
  validateStatus: (status) => status >= 200 && status < 300,
  transformResponse: [
    (data, headers) => {
      const contentType = String(headers['content-type'] ?? '')
      if (contentType.includes('application/json')) {
        try {
          return JSON.parse(data)
        } catch {
          return data
        }
      }
      return data
    }
  ]
})

/** 请求拦截器 */
axiosInstance.interceptors.request.use(
  (request: InternalAxiosRequestConfig) => {
    const { accessToken } = useUserStore()
    if (accessToken) {
      // 添加 Bearer 前缀
      request.headers.set('Authorization', `Bearer ${accessToken}`)
    }

    if (request.data && !(request.data instanceof FormData) && !request.headers['Content-Type']) {
      request.headers.set('Content-Type', 'application/json')
      request.data = JSON.stringify(request.data)
    }

    return request
  },
  (error) => {
    showError(createHttpError($t('httpMsg.requestConfigError'), ApiStatus.error))
    return Promise.reject(error)
  }
)

/** 响应拦截器 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse<Http.BaseResponse>) => {
    // 检查是否跳过验证（用于原始响应如 GeoJSON）
    const config = response.config as ExtendedAxiosRequestConfig
    if (config.skipResponseValidation) {
      return response
    }

    const { code, msg, message } = response.data
    // 优先使用 message 字段（后端返回），兼容 msg 字段
    const errorMessage = message || msg
    if (code === ApiStatus.success) return response
    // 退出登录等终态请求：401 不重入 logOut、不弹错，交由调用方自行 catch
    if (code === ApiStatus.unauthorized && !config.skipAuthHandler) {
      handleUnauthorizedError(errorMessage)
    }
    throw createHttpError(errorMessage || $t('httpMsg.requestFailed'), code)
  },
  (error) => {
    const config = error.config as ExtendedAxiosRequestConfig | undefined
    if (error.response?.status === ApiStatus.unauthorized && !config?.skipAuthHandler) {
      handleUnauthorizedError()
    }
    return Promise.reject(handleError(error))
  }
)

/** 统一创建HttpError */
function createHttpError(message: string, code: number) {
  return new HttpError(message, code)
}

/** 处理401错误（带防抖） */
function handleUnauthorizedError(message?: string): never {
  const error = createHttpError(message || $t('httpMsg.unauthorized'), ApiStatus.unauthorized)

  if (!isUnauthorizedErrorShown) {
    isUnauthorizedErrorShown = true
    logOut()

    unauthorizedTimer = setTimeout(resetUnauthorizedError, UNAUTHORIZED_DEBOUNCE_TIME)

    showError(error, true)
    throw error
  }

  throw error
}

/** 重置401防抖状态 */
function resetUnauthorizedError() {
  isUnauthorizedErrorShown = false
  if (unauthorizedTimer) clearTimeout(unauthorizedTimer)
  unauthorizedTimer = null
}

/** 退出登录函数 */
function logOut() {
  setTimeout(() => {
    useUserStore().logOut()
  }, LOGOUT_DELAY)
}

/** 是否需要重试 */
function shouldRetry(statusCode: number) {
  return [
    ApiStatus.requestTimeout,
    ApiStatus.internalServerError,
    ApiStatus.badGateway,
    ApiStatus.serviceUnavailable,
    ApiStatus.gatewayTimeout
  ].includes(statusCode)
}

/** 请求重试逻辑 */
// 函数重载：skipResponseValidation 为 true 时返回原始数据
async function retryRequest<T>(
  config: ExtendedAxiosRequestConfig & { skipResponseValidation: true },
  retries?: number
): Promise<T>
async function retryRequest<T>(
  config: ExtendedAxiosRequestConfig,
  retries?: number
): Promise<{ code: number; message: string; data: T }>
async function retryRequest<T>(
  config: ExtendedAxiosRequestConfig,
  retries: number = MAX_RETRIES
): Promise<T | { code: number; message: string; data: T }> {
  try {
    return await request<T>(config as any)
  } catch (error) {
    if (retries > 0 && error instanceof HttpError && shouldRetry(error.code)) {
      await delay(RETRY_DELAY)
      return retryRequest<T>(config, retries - 1)
    }
    throw error
  }
}

/** 延迟函数 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 请求函数 */
// 函数重载：skipResponseValidation 为 true 时返回原始数据
async function request<T = any>(
  config: ExtendedAxiosRequestConfig & { skipResponseValidation: true }
): Promise<T>
async function request<T = any>(
  config: ExtendedAxiosRequestConfig
): Promise<{ code: number; message: string; data: T }>
async function request<T = any>(
  config: ExtendedAxiosRequestConfig
): Promise<T | { code: number; message: string; data: T }> {
  // POST | PUT 参数自动填充
  if (
    ['POST', 'PUT'].includes(config.method?.toUpperCase() || '') &&
    config.params &&
    !config.data
  ) {
    config.data = config.params
    config.params = undefined
  }

  // Mock 拦截：匹配到路由时直接返回，不走网络
  if (USE_MOCK) {
    const handler = matchMock(config.method || 'GET', config.url || '')
    // 未注册的接口会穿透到真实网络，开发期打印警告便于发现遗漏
    if (!handler) {
      console.warn(`[Mock] 未注册，已穿透到真实网络: ${(config.method || 'GET').toUpperCase()} ${config.url || ''}`)
    }
    if (handler) {
      try {
        const mockData = handler({ params: config.params, data: config.data, url: config.url || '' })
        if (mockData === null || mockData === undefined) {
          return Promise.reject(new HttpError('数据不存在', 404))
        }
        if (config.showSuccessMessage) {
          showSuccess('操作成功')
        }
        return { code: 200, message: '', data: mockData } as any
      } catch (e: any) {
        const err = new HttpError(e.message || '操作失败', 500)
        if (config.showErrorMessage !== false) {
          showError(err, true)
        }
        return Promise.reject(err)
      }
    }
  }

  try {
    const res = await axiosInstance.request<Http.BaseResponse<T>>(config)

    // 如果 skipResponseValidation 为 true，返回原始数据
    if (config.skipResponseValidation) {
      return res.data as T
    }

    // 显示成功消息（优先使用 message 字段）
    const successMessage = res.data.message || res.data.msg
    if (config.showSuccessMessage && successMessage) {
      showSuccess(successMessage)
    }

    // 解构返回，简化业务代码的数据访问
    return {
      code: res.data.code,
      message: res.data.message || '',
      data: res.data.data
    }
  } catch (error) {
    if (error instanceof HttpError && error.code !== ApiStatus.unauthorized) {
      const showMsg = config.showErrorMessage !== false
      showError(error, showMsg)
    }
    return Promise.reject(error)
  }
}

/** API方法集合 */
// GET 方法
function get<T>(config: ExtendedAxiosRequestConfig & { skipResponseValidation: true }): Promise<T>
function get<T>(
  config: ExtendedAxiosRequestConfig
): Promise<{ code: number; message: string; data: T }>
function get<T>(
  config: ExtendedAxiosRequestConfig
): Promise<T | { code: number; message: string; data: T }> {
  return retryRequest<T>({ ...config, method: 'GET' } as any)
}

// POST 方法
function post<T>(config: ExtendedAxiosRequestConfig & { skipResponseValidation: true }): Promise<T>
function post<T>(
  config: ExtendedAxiosRequestConfig
): Promise<{ code: number; message: string; data: T }>
function post<T>(
  config: ExtendedAxiosRequestConfig
): Promise<T | { code: number; message: string; data: T }> {
  return retryRequest<T>({ ...config, method: 'POST' } as any)
}

// PUT 方法
function put<T>(config: ExtendedAxiosRequestConfig & { skipResponseValidation: true }): Promise<T>
function put<T>(
  config: ExtendedAxiosRequestConfig
): Promise<{ code: number; message: string; data: T }>
function put<T>(
  config: ExtendedAxiosRequestConfig
): Promise<T | { code: number; message: string; data: T }> {
  return retryRequest<T>({ ...config, method: 'PUT' } as any)
}

// DELETE 方法
function del<T>(config: ExtendedAxiosRequestConfig & { skipResponseValidation: true }): Promise<T>
function del<T>(
  config: ExtendedAxiosRequestConfig
): Promise<{ code: number; message: string; data: T }>
function del<T>(
  config: ExtendedAxiosRequestConfig
): Promise<T | { code: number; message: string; data: T }> {
  return retryRequest<T>({ ...config, method: 'DELETE' } as any)
}

// REQUEST 方法
function requestMethod<T>(
  config: ExtendedAxiosRequestConfig & { skipResponseValidation: true }
): Promise<T>
function requestMethod<T>(
  config: ExtendedAxiosRequestConfig
): Promise<{ code: number; message: string; data: T }>
function requestMethod<T>(
  config: ExtendedAxiosRequestConfig
): Promise<T | { code: number; message: string; data: T }> {
  return retryRequest<T>(config as any)
}

const api = {
  get,
  post,
  put,
  del,
  request: requestMethod
}

export default api
