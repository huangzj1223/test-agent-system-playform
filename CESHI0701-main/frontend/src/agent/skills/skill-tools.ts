/**
 * 技能工具接入层
 *
 * 把后端「已启用技能」解析出的工具定义，转成前端统一的 FrontendAction 注册进注册中心，
 * 从而复用现有的工具暴露（toToolDefinitions）与执行（getActionByWireName）链路，
 * 无需改动 useAgUiAgent 的核心逻辑。
 *
 * 安全边界：工具的调用地址（http.path）来自后端能力目录（vetted），前端只按后端给的
 * method+path 发请求，不接受任意 URL；执行仍走已鉴权的 request 封装，后端接口守卫是最终边界。
 */
import request from '@/utils/http'
import {
  registerActions,
  type FrontendAction,
  type ActionResult
} from '@/agent/frontend-action-registry'
import {
  fetchEnabledSkillTools,
  recordSkillRun,
  checkSkillPolicy,
  type ResolvedSkillTool
} from '@/api/agentSkill'

/** 当前技能工具的注销函数（重新同步前先注销旧的，避免重复/残留） */
let disposeSkillTools: (() => void) | null = null

/**
 * 按后端绑定发起工具调用
 * @param tool 已解析的工具定义（含 http 绑定）
 * @param args 模型生成的参数
 * @returns 后端返回的数据
 */
async function callToolEndpoint(
  tool: ResolvedSkillTool,
  args: Record<string, unknown>
): Promise<unknown> {
  if (tool.http.method === 'GET') {
    return request.get({ url: tool.http.path, params: args })
  }
  return request.post({ url: tool.http.path, data: args })
}

/**
 * 上报一次技能能力运行日志（埋点）。不阻断主链路：失败静默吞掉。
 * @param capabilityKey 能力 key
 * @param success 是否成功
 * @param durationMs 耗时（毫秒）
 * @param errorMsg 失败信息（可选）
 */
function logSkillRun(
  capabilityKey: string,
  success: boolean,
  durationMs: number,
  errorMsg?: string
): void {
  // fire-and-forget：埋点不应影响工具执行结果，异常一律吞掉
  void recordSkillRun({ capabilityKey, success, durationMs, errorMsg }).catch(() => undefined)
}

/**
 * 把一个已解析工具转成 FrontendAction
 * @param tool 已解析的工具定义
 */
/**
 * 执行前安全策略闸门：调后端 check 委托 SecurityCheckService 统一判定。
 * 返回拦截原因字符串表示"不放行"，返回 null 表示放行。
 * 安全姿态：check 调用本身失败时 fail-closed（拦截）——本闸门是聊天执行时风险策略层的
 * 唯一执行点（后端接口守卫只覆盖权限点，不覆盖 L4/黑名单/审批），故不容错开。
 * @param tool 工具定义
 * @param args 调用参数（作为 payload 供危险内容检测）
 */
async function runPolicyGate(tool: ResolvedSkillTool, args: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await checkSkillPolicy({
      skillKey: tool.skillKey,
      capabilityKey: tool.capabilityKey,
      payload: args
    })
    const r = res.data
    if (!r) return '安全策略校验无响应，已拦截'
    if (r.requireApproval) {
      return `该操作需审批后执行（风险等级 ${r.riskLevel}${r.approvalRequestId ? `，工单 #${r.approvalRequestId}` : ''}）`
    }
    if (!r.allowed) return r.blockedReason || `安全策略拦截（风险等级 ${r.riskLevel}）`
    return null
  } catch (e) {
    return `安全策略校验失败，已拦截：${(e as Error)?.message || '未知错误'}`
  }
}

function toAction(tool: ResolvedSkillTool): FrontendAction {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    permission: tool.requiredPerms,
    // 敏感工具（写盘/改数据）标为 high 并要求确认；其余只读，low 无需确认
    riskLevel: tool.sensitive ? 'high' : 'low',
    requireConfirmation: Boolean(tool.sensitive),
    execute: async (args: Record<string, unknown>): Promise<ActionResult> => {
      const startedAt = Date.now()
      // 执行前安全策略统一治理：被拦截（L4/黑名单/敏感词/需审批）则不发起调用
      const gate = await runPolicyGate(tool, args ?? {})
      if (gate) {
        logSkillRun(tool.capabilityKey, false, Date.now() - startedAt, gate)
        return { success: false, action: tool.name, message: gate }
      }
      try {
        const data = await callToolEndpoint(tool, args ?? {})
        // 埋点：记录成功运行日志（不阻断主链路，失败静默）
        logSkillRun(tool.capabilityKey, true, Date.now() - startedAt)
        return { success: true, action: tool.name, message: '执行成功', data }
      } catch (e) {
        const message = (e as Error)?.message || '执行失败'
        logSkillRun(tool.capabilityKey, false, Date.now() - startedAt, message)
        return { success: false, action: tool.name, message }
      }
    }
  }
}

/**
 * 从后端拉取已启用技能工具并注册进注册中心（覆盖式：先注销旧的）。
 * 在聊天面板挂载时、以及技能配置变更后调用。
 * 失败不抛出（不阻断聊天可用），仅静默保持上次状态。
 */
export async function syncSkillTools(): Promise<void> {
  try {
    const res = await fetchEnabledSkillTools()
    const tools = res.data || []
    disposeSkillTools?.()
    disposeSkillTools = registerActions(tools.map(toAction))
  } catch {
    // 拉取失败时保留已注册工具，不影响聊天基本使用
  }
}

/** 注销全部技能工具（一般无需手动调用，重新同步会自动覆盖） */
export function clearSkillTools(): void {
  disposeSkillTools?.()
  disposeSkillTools = null
}
