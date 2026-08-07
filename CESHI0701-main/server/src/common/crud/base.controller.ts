/**
 * 控制器基类 - 提供统一响应格式
 *
 * 所有控制器返回的响应结构统一为 { code, data, message }，
 * 由 ok/fail 两个辅助方法生成，避免各处手写响应体。
 */
export class BaseController {
  /**
   * 构造成功响应
   * @param data 业务数据，缺省时返回 null
   * @param message 提示文案，默认 'success'
   * @returns 统一成功响应体（code 固定为 200）
   */
  ok(data?: any, message = 'success') {
    return { code: 200, data: data ?? null, message };
  }

  /**
   * 构造失败响应
   * @param message 错误提示文案，默认 'error'
   * @param code 业务错误码，默认 400
   * @returns 统一失败响应体（data 固定为 null）
   */
  fail(message = 'error', code = 400) {
    return { code, data: null, message };
  }
}
