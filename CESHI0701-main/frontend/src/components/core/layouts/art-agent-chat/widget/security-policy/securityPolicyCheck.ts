/**
 * 安全策略统一校验入口
 * checkSecurityPolicy(context) 汇总风险等级默认行为、沙箱黑白名单、敏感词、审批规则，
 * 给出是否允许、是否需审批/确认、拦截原因、命中策略与是否需审计。
 * 作为高层入口，与 toolPermission 的 checkToolPermission 规则对齐（后者可委托本方法）。
 * 当前基于前端 mock 策略，后续可注入后端返回的安全策略配置。
 */
import type {
  SecurityCheckContext,
  SecurityCheckResult,
  RiskLevel,
  DefaultAction,
  RiskLevelPolicy,
  SandboxPolicy,
  SensitiveRule,
  BlackWhiteList
} from './types'
import {
  createRiskPolicies,
  createSandboxPolicy,
  createSensitiveRules,
  createBlackWhiteList
} from './mockSecurityPolicies'

/** 可选注入的策略数据源（默认取 mock，接后端时替换为后端配置） */
interface PolicySource {
  riskPolicies: RiskLevelPolicy[]
  sandbox: SandboxPolicy
  sensitiveRules: SensitiveRule[]
  blackWhiteList: BlackWhiteList
}

/**
 * CLI 危险命令关键字（命中即拦截）
 * 多词短语走子串匹配，单词级关键字走词边界匹配（见 checkCli），避免误拦截 sudoku 等。
 */
const DANGEROUS_CLI_PHRASES = ['rm -rf', 'chmod 777', 'dd if=', 'drop database']
const DANGEROUS_CLI_WORDS = ['sudo', 'chown', 'shutdown', 'reboot', 'mkfs', 'truncate']

/** SQL 高风险关键字（命中判高风险） */
const DANGEROUS_SQL = ['drop', 'truncate', 'delete']

/** 必须人工确认的记忆文件 */
const CONFIRM_MEMORY_FILES = ['soul.md', 'user.md']

/** 风险等级排序（用于取较高者） */
const RISK_ORDER: RiskLevel[] = ['L1', 'L2', 'L3', 'L4']

/** 取两个风险等级中的较高者 */
function escalate(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b
}

/** 命中任一关键字（大小写不敏感，词边界匹配可选） */
function hitsKeyword(text: string, keywords: string[], wordBoundary = false): string | null {
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const ok = wordBoundary ? new RegExp(`\\b${escaped}\\b`).test(lower) : lower.includes(kw.toLowerCase())
    if (ok) return kw
  }
  return null
}

/**
 * 检查 CLI 命令是否命中危险指令：内置短语(子串) + 内置单词(词边界) + 用户配置的命令黑名单
 * @param command 命令文本
 * @param userBlacklist 用户在黑白名单页配置的命令黑名单条目内容
 */
function hitsDangerousCli(command: string, userBlacklist: string[]): string | null {
  return (
    hitsKeyword(command, DANGEROUS_CLI_PHRASES) ||
    hitsKeyword(command, DANGEROUS_CLI_WORDS, true) ||
    hitsKeyword(command, userBlacklist)
  )
}

/**
 * 检查是否命中黑名单目录/API/表字段
 * 目录黑名单取沙箱文件配置，API/表字段取黑白名单页配置，二者共同生效。
 * @param sandbox 沙箱策略（取文件/数据库黑名单）
 * @param bwl 黑白名单（取目录白名单 / API·DB 黑名单）
 * @param ctx 校验上下文
 */
function hitsBlacklist(sandbox: SandboxPolicy, bwl: BlackWhiteList, ctx: SecurityCheckContext): string | null {
  // 文件目录：命中沙箱黑名单目录即拦截
  if (ctx.filePath) {
    const dir = sandbox.file.deniedDirectories.find((d) => ctx.filePath!.startsWith(d))
    if (dir) return `目录黑名单：${dir}`
  }
  // API 路径：命中黑白名单页的启用条目即拦截
  if (ctx.apiPath) {
    const api = bwl.apiDbBlacklist.find((i) => i.enabled && ctx.apiPath!.includes(i.value))
    if (api) return `API 黑名单：${api.value}`
  }
  // 数据库：命中沙箱禁止表或黑白名单页表字段
  if (ctx.actionType === 'database' && (ctx.sql || ctx.payload)) {
    const text = `${ctx.sql || ''} ${JSON.stringify(ctx.payload || {})}`.toLowerCase()
    const table = sandbox.database.deniedTables.find((t) => text.includes(t.toLowerCase()))
    if (table) return `数据表黑名单：${table}`
    const field = bwl.apiDbBlacklist.find((i) => i.enabled && text.includes(i.value.toLowerCase()))
    if (field) return `数据字段黑名单：${field.value}`
  }
  return null
}

/** 推断上下文的有效风险等级：显式传入优先，否则按内容/动作推断 */
function resolveRiskLevel(ctx: SecurityCheckContext, cliBlacklist: string[]): RiskLevel {
  let risk: RiskLevel = ctx.riskLevel || 'L1'
  // 规则 6：SQL 含 DROP/TRUNCATE/DELETE 判高风险
  if (ctx.actionType === 'database' && ctx.sql && hitsKeyword(ctx.sql, DANGEROUS_SQL, true)) {
    risk = escalate(risk, 'L4')
  }
  // 规则 5：CLI 危险命令 → 最高风险
  if (ctx.actionType === 'cli' && ctx.command && hitsDangerousCli(ctx.command, cliBlacklist)) {
    risk = escalate(risk, 'L4')
  }
  return risk
}

/** 从黑白名单取启用的命令黑名单条目内容 */
function enabledCliBlacklist(bwl: BlackWhiteList): string[] {
  return bwl.commandBlacklist.filter((i) => i.enabled).map((i) => i.value)
}

/**
 * 安全策略统一校验（高层入口，供 Skills 与工具权限复用）
 * @param ctx 校验上下文
 * @param source 策略数据源（默认取当前 mock 策略；接后端时注入后端配置）
 * @returns 校验结果
 */
export function checkSecurityPolicy(
  ctx: SecurityCheckContext,
  source?: Partial<PolicySource>
): SecurityCheckResult {
  const riskPolicies = source?.riskPolicies || createRiskPolicies()
  const sandbox = source?.sandbox || createSandboxPolicy()
  const sensitiveRules = source?.sensitiveRules || createSensitiveRules()
  const blackWhiteList = source?.blackWhiteList || createBlackWhiteList()
  const cliBlacklist = enabledCliBlacklist(blackWhiteList)
  const matched: string[] = []

  const risk = resolveRiskLevel(ctx, cliBlacklist)
  const auditRequired = risk === 'L3' || risk === 'L4' // 规则 10：L3/L4 必记审计

  // 规则 5：CLI 危险命令直接拦截（内置危险指令 + 用户配置的命令黑名单）
  if (ctx.actionType === 'cli' && ctx.command) {
    const kw = hitsDangerousCli(ctx.command, cliBlacklist)
    if (kw) {
      matched.push(`CLI 黑名单：${kw}`)
      return block(risk, `命中 CLI 危险命令：${kw}`, matched, auditRequired)
    }
  }

  // 规则 8：黑名单目录/API/表字段直接拦截
  const blacklistHit = hitsBlacklist(sandbox, blackWhiteList, ctx)
  if (blacklistHit) {
    matched.push(blacklistHit)
    return block(risk, `命中黑名单：${blacklistHit}`, matched, auditRequired)
  }

  // 规则 7：写入 soul.md / user.md 必须人工确认
  if (ctx.actionType === 'memory' && ctx.memoryFile && CONFIRM_MEMORY_FILES.includes(ctx.memoryFile)) {
    matched.push(`记忆写入确认：${ctx.memoryFile}`)
    return {
      allowed: true,
      riskLevel: escalate(risk, 'L3'),
      requireApproval: false,
      requireConfirm: true,
      matchedPolicies: matched,
      auditRequired: true
    }
  }

  // 规则 9：命中敏感词，按处理方式决定
  const sensitiveResult = matchSensitive(ctx, sensitiveRules, matched, risk)
  if (sensitiveResult) return sensitiveResult

  // 规则 1-4：按风险等级默认行为出结论
  return decideByRisk(risk, riskPolicies, matched, auditRequired)
}

/** 构造拦截结果 */
function block(risk: RiskLevel, reason: string, matched: string[], audit: boolean): SecurityCheckResult {
  return {
    allowed: false,
    riskLevel: risk,
    requireApproval: false,
    requireConfirm: false,
    blockedReason: reason,
    matchedPolicies: matched,
    auditRequired: audit || risk === 'L3' || risk === 'L4'
  }
}

/** 收集上下文中的可检测文本（命令/SQL/参数） */
function contextText(ctx: SecurityCheckContext): string {
  return `${ctx.command || ''} ${ctx.sql || ''} ${JSON.stringify(ctx.payload || {})}`.toLowerCase()
}

/**
 * 规则 9：命中敏感词按处理方式返回结果，未命中返回 null
 * block/deny_memory → 拦截；confirm → 需确认；mask/audit/allow → 放行但标记审计
 */
function matchSensitive(
  ctx: SecurityCheckContext,
  rules: SensitiveRule[],
  matched: string[],
  risk: RiskLevel
): SecurityCheckResult | null {
  const text = contextText(ctx)
  for (const rule of rules) {
    if (!rule.enabled) continue
    // 匹配规则用「/」分隔多个关键字，去掉通配星号做包含匹配
    const keywords = rule.pattern.split('/').map((k) => k.trim().replace(/\*/g, '').toLowerCase()).filter(Boolean)
    const hit = keywords.some((k) => k && text.includes(k))
    if (!hit) continue
    matched.push(`敏感词：${rule.type}`)
    if (rule.action === 'block' || rule.action === 'deny_memory') {
      return block(risk, `命中敏感词规则「${rule.type}」，${rule.action === 'block' ? '阻止执行' : '禁止写入记忆'}`, matched, true)
    }
    if (rule.action === 'confirm') {
      return { allowed: true, riskLevel: risk, requireApproval: false, requireConfirm: true, matchedPolicies: matched, auditRequired: true }
    }
    // mask / audit / allow：放行，标记审计
    return { allowed: true, riskLevel: risk, requireApproval: false, requireConfirm: false, matchedPolicies: matched, auditRequired: true }
  }
  return null
}

/** 各等级出厂默认行为（管理员未配置时兜底：L1/L2 允许、L3 需审批、L4 拒绝） */
const DEFAULT_ACTION_BY_LEVEL: Record<RiskLevel, DefaultAction> = {
  L1: 'allow',
  L2: 'allow',
  L3: 'require_approval',
  L4: 'deny'
}

/**
 * 规则 1-4：按风险等级「配置的默认行为」出结论（而非按等级名硬编码），
 * 使管理员在风险等级设置中修改的 defaultAction 真正生效。
 * allow → 允许无审批；require_approval → 允许但需审批+二次确认；deny → 拒绝执行。
 */
function decideByRisk(
  risk: RiskLevel,
  policies: RiskLevelPolicy[],
  matched: string[],
  audit: boolean
): SecurityCheckResult {
  const policy = policies.find((p) => p.level === risk)
  matched.push(`风险等级默认行为：${risk}`)
  const base = { riskLevel: risk, matchedPolicies: matched, auditRequired: audit }

  // 若该等级被禁用，视为拒绝
  if (policy && !policy.enabled) {
    return { ...base, allowed: false, requireApproval: false, requireConfirm: false, blockedReason: `风险等级 ${risk} 已停用` }
  }

  // 读取管理员配置的默认行为，缺省回退到出厂默认
  const action = policy?.defaultAction ?? DEFAULT_ACTION_BY_LEVEL[risk]
  switch (action) {
    case 'allow':
      return { ...base, allowed: true, requireApproval: false, requireConfirm: false }
    case 'require_approval':
      return { ...base, allowed: true, requireApproval: true, requireConfirm: true }
    case 'deny':
      return { ...base, allowed: false, requireApproval: false, requireConfirm: false, blockedReason: `风险等级 ${risk} 默认拒绝执行` }
    default:
      return { ...base, allowed: false, requireApproval: false, requireConfirm: false, blockedReason: '未知默认行为' }
  }
}


