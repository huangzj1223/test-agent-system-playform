/**
 * 验证码API接口
 */
import request from '@/utils/http'
import { mockGetCaptcha } from '@/mock/auth'

// 是否使用 Mock 模式
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/**
 * 验证码响应数据
 */
export interface CaptchaResponse {
  captchaId: string // 验证码ID
  captchaImage: string // Base64图片数据
}

/**
 * 获取图形验证码
 */
export function getCaptcha() {
  // Mock 模式：返回符合 HTTP 响应格式的 Mock 验证码
  if (USE_MOCK) {
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        resolve({
          code: 200,
          data: mockGetCaptcha(),
          message: '获取验证码成功'
        })
      }, 200) // 模拟网络延迟
    })
  }

  // 真实 API 模式
  return request.get<CaptchaResponse>({
    url: '/api/captcha/image'
  })
}

/**
 * 验证图形验证码
 */
export function verifyCaptcha(captchaId: string, captchaCode: string) {
  return request.get<{ valid: boolean }>({
    url: '/api/captcha/verify',
    params: {
      captchaId,
      captchaCode
    }
  })
}
