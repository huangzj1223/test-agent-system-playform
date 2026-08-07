/**
 * 高风险操作确认（Action Confirmation）
 *
 * 智能体执行 high 风险操作（删除/提交/批量等）前，在聊天窗口弹出确认卡片，
 * 等待用户点击"确认执行"或"取消"。基于 Promise：请求方 await 用户决策。
 * 同一时刻仅存在一个待确认请求（串行执行，避免并发确认混淆）。
 */
import { ref } from 'vue'

/** 待确认请求 */
export interface ConfirmationRequest {
  /** 关联的工具调用 ID */
  toolCallId: string
  /** 操作名称（如 department.delete） */
  action: string
  /** 操作中文名（如 删除部门） */
  actionLabel: string
  /** 操作对象（如 研发部） */
  target: string
  /** 影响说明 */
  impact: string
  /** 执行人（当前用户名） */
  operator: string
}

/** 当前待确认请求（null 表示无） */
const pending = ref<ConfirmationRequest | null>(null)
/** 当前请求的决策 resolver */
let resolver: ((confirmed: boolean) => void) | null = null

/** 供 UI 读取的当前待确认请求 */
export const pendingConfirmation = pending

/**
 * 发起一次确认，返回用户是否确认的 Promise。
 * 若已有待确认请求，直接判定为取消（避免并发覆盖）。
 * @param req 确认请求
 */
export function requestConfirmation(req: ConfirmationRequest): Promise<boolean> {
  if (pending.value) return Promise.resolve(false)
  pending.value = req
  return new Promise<boolean>((resolve) => {
    resolver = resolve
  })
}

/**
 * 用户决策：确认或取消。清空待确认态并兑现 Promise。
 * @param confirmed 是否确认执行
 */
export function resolveConfirmation(confirmed: boolean): void {
  const fn = resolver
  pending.value = null
  resolver = null
  fn?.(confirmed)
}

/** 是否有待确认请求 */
export function hasPendingConfirmation(): boolean {
  return pending.value !== null
}
