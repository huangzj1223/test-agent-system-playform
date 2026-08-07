declare namespace Http {
  /** 基础响应 */
  interface BaseResponse<T = unknown> {
    // 状态码
    code: number
    // 消息（兼容后端的message字段）
    msg?: string
    message?: string
    // 数据
    data: T
    // 是否成功（后端返回）
    success?: boolean
    // 时间戳（后端返回）
    timestamp?: number
  }
}
