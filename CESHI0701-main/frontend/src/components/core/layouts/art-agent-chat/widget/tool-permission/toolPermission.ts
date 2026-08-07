/**
 * 工具权限检查
 * 供 Skills 执行前调用：根据工具启用状态、风险等级、动作与载荷判定是否允许执行、
 * 是否需要人工确认。当前基于前端 mock 工具清单，后续可替换为后端返回的工具配置。
 */
import type { AgentTool, ToolAction, ToolPermissionCheckResult, RiskLevel } from './types'

/** CLI 危险命令关键字（命中即判定高风险，强制确认） */
const DANGEROUS_CLI = ['rm -rf', 'sudo', 'chmod', 'chown', 'shutdown', 'mkfs', 'dd ']

/** SQL 高风险关键字（命中即判定高风险，强制确认） */
const DANGEROUS_SQL = ['delete', 'drop', 'truncate']

/** 强制需要人工确认的动作（文件删除、DB 删除、系统命令、生产发布等） */
const FORCE_CONFIRM_ACTIONS: ToolAction[] = ['delete']

/**
 * 从载荷中提取待检测的命令/SQL 文本（兼容常见字段名）
 * @param payload 调用载荷
 */
function extractText(payload?: Record<string, unknown>): string {
  if (!payload) return ''
  const candidates = [payload.command, payload.sql, payload.script, payload.cmd]
  return candidates
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase()
}

/** 命令文本是否命中 CLI 危险关键字 */
function hasDangerousCli(text: string): boolean {
  return DANGEROUS_CLI.some((kw) => text.includes(kw))
}

/** SQL 文本是否命中高风险关键字 */
function hasDangerousSql(text: string): boolean {
  return DANGEROUS_SQL.some((kw) => new RegExp(`\\b${kw}\\b`).test(text))
}

/**
 * 是否被安全策略允许执行 L4 高风险工具
 * 当前为 mock：默认不允许；后续接入「安全策略」页签配置后替换此处。
 */
function isL4AllowedBySecurityPolicy(): boolean {
  return false
}

/**
 * 检查工具调用权限
 * @param tool 目标工具（未找到时由调用方处理）
 * @param action 调用动作
 * @param payload 调用载荷（用于危险命令/SQL 检测）
 * @returns 权限检查结果
 */
export function checkToolPermission(
  tool: AgentTool | undefined,
  action: ToolAction,
  payload?: Record<string, unknown>
): ToolPermissionCheckResult {
  // 规则 0：工具不存在
  if (!tool) {
    return { allowed: false, riskLevel: 'L4', requireConfirm: false, reason: '工具不存在或未注册' }
  }

  // 规则 1：工具未启用 → 禁止执行
  if (!tool.enabled) {
    return { allowed: false, riskLevel: tool.riskLevel, requireConfirm: false, reason: '工具已禁用，禁止执行' }
  }

  const text = extractText(payload)
  let effectiveRisk: RiskLevel = tool.riskLevel

  // 规则 7/8：按内容动态升级风险等级（DB 高危 SQL、CLI 危险命令）
  if (tool.type === 'database' && hasDangerousSql(text)) {
    effectiveRisk = escalate(effectiveRisk, 'L3')
  }
  if (tool.type === 'cli' && hasDangerousCli(text)) {
    effectiveRisk = escalate(effectiveRisk, 'L4')
  }

  // 规则 6：强制确认动作（删除等）
  const forceConfirm = FORCE_CONFIRM_ACTIONS.includes(action) || tool.requireConfirm

  return decideByRisk(effectiveRisk, forceConfirm)
}

/** 取两个风险等级中的较高者 */
function escalate(a: RiskLevel, b: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ['L1', 'L2', 'L3', 'L4']
  return order.indexOf(a) >= order.indexOf(b) ? a : b
}

/**
 * 按风险等级出结论
 * L1 允许；L2 允许（是否确认取决于配置）；L3 需确认；L4 默认禁止（除非安全策略允许）
 */
function decideByRisk(risk: RiskLevel, forceConfirm: boolean): ToolPermissionCheckResult {
  switch (risk) {
    case 'L1':
      return { allowed: true, riskLevel: risk, requireConfirm: forceConfirm }
    case 'L2':
      return { allowed: true, riskLevel: risk, requireConfirm: forceConfirm }
    case 'L3':
      return { allowed: true, riskLevel: risk, requireConfirm: true, reason: '高风险操作，执行前需人工确认' }
    case 'L4':
      return isL4AllowedBySecurityPolicy()
        ? { allowed: true, riskLevel: risk, requireConfirm: true, reason: '高风险执行，需人工确认' }
        : { allowed: false, riskLevel: risk, requireConfirm: false, reason: '高风险工具默认禁止，需安全策略放行' }
    default:
      return { allowed: false, riskLevel: risk, requireConfirm: false, reason: '未知风险等级' }
  }
}
