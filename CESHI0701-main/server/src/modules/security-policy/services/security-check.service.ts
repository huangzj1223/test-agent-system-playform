import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { SecurityPolicyService } from './security-policy.service';
import { ApprovalRequestService } from './approval-request.service';
import { maskPayload } from '../util/mask-payload';

/** 安全校验上下文 */
export interface SecurityCheckContext {
  actionType: string;
  command?: string;
  sql?: string;
  filePath?: string;
  apiPath?: string;
  memoryFile?: string;
  riskLevel?: string;
  skillKey?: string;
  toolKey?: string;
  payload?: Record<string, unknown>;
  /** 纯裁决预判：为 true 时只给结论，不产生副作用（不写审计、不建审批工单）。用于前端 /check 预览。 */
  dryRun?: boolean;
}

/** 安全校验结果 */
export interface SecurityCheckResult {
  allowed: boolean;
  riskLevel: string;
  requireApproval: boolean;
  requireConfirm: boolean;
  blockedReason?: string;
  matchedPolicies: string[];
  auditRequired: boolean;
  /** 需审批且已创建审批工单时的工单 ID */
  approvalRequestId?: number;
}

/** CLI 危险短语（子串匹配） */
const DANGEROUS_CLI_PHRASES = ['rm -rf', 'chmod 777', 'dd if=', 'drop database'];
/** CLI 危险单词（词边界匹配，避免误伤 sudoku 等） */
const DANGEROUS_CLI_WORDS = ['sudo', 'chown', 'shutdown', 'reboot', 'mkfs', 'truncate'];
/** SQL 高危关键字（词边界） */
const DANGEROUS_SQL = ['drop', 'truncate', 'delete'];
/**
 * 必须人工确认的记忆文件。
 * 记忆文件已改为「每用户独立」——用户改自己的副本仅影响自己，不再强制人工确认，故清空。
 * 保留该规则结构以便将来对共享/全局记忆再启用。
 */
const CONFIRM_MEMORY_FILES: string[] = [];
/** 风险等级排序 */
const RISK_ORDER = ['L1', 'L2', 'L3', 'L4'];
/** 各等级出厂默认行为（管理员未配置时兜底） */
const DEFAULT_ACTION_BY_LEVEL: Record<string, string> = {
  L1: 'allow',
  L2: 'allow',
  L3: 'require_approval',
  L4: 'deny',
};

/**
 * 安全策略统一校验服务（后端权威入口）
 *
 * 从库读取风险等级 / 沙箱 / 敏感词 / 黑白名单，对操作上下文给出校验结论。
 * 黑白名单表是命令/目录/API·表名单的唯一权威源（沙箱不再冗余）。
 * L3/L4 或被拦截的操作按审计策略写审计日志。供 Skills 与工具权限（checkToolPermission）委托复用。
 */
@Injectable()
export class SecurityCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: SecurityPolicyService,
    private readonly approval: ApprovalRequestService,
  ) {}

  /** 取两个风险等级中的较高者 */
  private escalate(a: string, b: string): string {
    return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
  }

  /** 命中任一关键字（大小写不敏感，可选词边界；关键字做正则转义防注入） */
  private hitsKeyword(text: string, keywords: string[], wordBoundary = false): string | null {
    const lower = text.toLowerCase();
    for (const kw of keywords) {
      if (!kw) continue;
      const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const ok = wordBoundary ? new RegExp(`\\b${escaped}\\b`).test(lower) : lower.includes(kw.toLowerCase());
      if (ok) return kw;
    }
    return null;
  }

  /** CLI 危险指令：内置短语 + 内置单词(词边界) + 用户命令黑名单 */
  private hitsDangerousCli(command: string, userBlacklist: string[]): string | null {
    return (
      this.hitsKeyword(command, DANGEROUS_CLI_PHRASES) ||
      this.hitsKeyword(command, DANGEROUS_CLI_WORDS, true) ||
      this.hitsKeyword(command, userBlacklist)
    );
  }

  /** 收集上下文可检测文本（命令/SQL/参数） */
  private contextText(ctx: SecurityCheckContext): string {
    return `${ctx.command || ''} ${ctx.sql || ''} ${JSON.stringify(ctx.payload || {})}`.toLowerCase();
  }

  /** 构造拦截结果 */
  private block(risk: string, reason: string, matched: string[]): SecurityCheckResult {
    return {
      allowed: false,
      riskLevel: risk,
      requireApproval: false,
      requireConfirm: false,
      blockedReason: reason,
      matchedPolicies: matched,
      auditRequired: true,
    };
  }

  /**
   * 安全策略统一校验：从库读策略，按 10 条规则给出结论，并按需写审计日志。
   * @param ctx 校验上下文
   * @param userId 发起用户 ID（写审计用）
   */
  async check(ctx: SecurityCheckContext, userId?: number): Promise<SecurityCheckResult> {
    // 从库读取策略数据（黑白名单为命令/表名单权威源）
    const [riskPolicies, sensitiveRules, bwl] = await Promise.all([
      this.policy.listRisk(),
      this.policy.listSensitive(),
      this.policy.blackWhiteList(),
    ]);
    const cliBlacklist = bwl.commandBlacklist.filter((i) => i.enabled).map((i) => i.value);
    const matched: string[] = [];

    // 有效风险等级：显式优先，SQL/CLI 危险内容升级
    let risk = ctx.riskLevel || 'L1';
    if (ctx.actionType === 'database' && ctx.sql && this.hitsKeyword(ctx.sql, DANGEROUS_SQL, true)) {
      risk = this.escalate(risk, 'L4');
    }
    if (ctx.actionType === 'cli' && ctx.command && this.hitsDangerousCli(ctx.command, cliBlacklist)) {
      risk = this.escalate(risk, 'L4');
    }

    let result: SecurityCheckResult;
    // 规则 5：CLI 危险命令直接拦截
    const cliHit = ctx.actionType === 'cli' && ctx.command ? this.hitsDangerousCli(ctx.command, cliBlacklist) : null;
    if (cliHit) {
      matched.push(`CLI 黑名单：${cliHit}`);
      result = this.block(risk, `命中 CLI 危险命令：${cliHit}`, matched);
    } else {
      // 规则 8：黑名单目录/API/表字段拦截
      const blHit = this.hitsBlacklist(bwl, ctx);
      if (blHit) {
        matched.push(blHit);
        result = this.block(risk, `命中黑名单：${blHit}`, matched);
      } else if (ctx.actionType === 'memory' && ctx.memoryFile && CONFIRM_MEMORY_FILES.includes(ctx.memoryFile)) {
        // 规则 7：写 soul.md/user.md 必须人工确认
        matched.push(`记忆写入确认：${ctx.memoryFile}`);
        result = {
          allowed: true,
          riskLevel: this.escalate(risk, 'L3'),
          requireApproval: false,
          requireConfirm: true,
          matchedPolicies: matched,
          auditRequired: true,
        };
      } else {
        // 规则 9：敏感词；未命中 → 规则 1-4 风险等级默认行为
        result =
          this.matchSensitive(ctx, sensitiveRules, matched, risk) ??
          this.decideByRisk(risk, riskPolicies, matched);
      }
    }

    // 纯裁决预判（dryRun）：只返回结论，不写审计、不建审批工单（避免前端 /check 预览产生副作用）
    if (ctx.dryRun) {
      return result;
    }

    await this.writeAuditIfNeeded(ctx, result, userId);

    // 规则接入：命中"需人工审批"时创建审批工单，回传工单 ID 供前端追踪
    if (result.allowed && result.requireApproval) {
      try {
        const { id } = await this.approval.createRequest({
          actionType: ctx.actionType,
          targetDesc: this.describeAction(ctx),
          riskLevel: result.riskLevel,
          // 工单 payload 脱敏后落库，与审计日志一致，避免敏感明文长期可查
          payload: maskPayload(ctx.payload) ?? undefined,
          requesterId: userId,
          skillKey: ctx.skillKey,
          toolKey: ctx.toolKey,
        });
        result.approvalRequestId = id;
      } catch {
        // 建单失败不影响校验结论返回
      }
    }
    return result;
  }

  /**
   * 判断文件路径是否在某白名单目录内（按路径分段边界，防前缀绕过）。
   * 先归一化消除 `..` 穿越与结尾斜杠，再要求完全相等或以「目录/」开头，
   * 避免 /a/src-secrets 命中白名单 /a/src。
   */
  private isUnderDir(filePath: string, dir: string): boolean {
    const norm = (p: string) => {
      const segs: string[] = [];
      for (const seg of p.replace(/\\/g, '/').split('/')) {
        if (seg === '' || seg === '.') continue;
        if (seg === '..') segs.pop();
        else segs.push(seg);
      }
      return '/' + segs.join('/');
    };
    const f = norm(filePath);
    const d = norm(dir);
    return f === d || f.startsWith(d === '/' ? '/' : d + '/');
  }

  /** 规则 8：黑名单目录/API/表字段（目录白名单未覆盖即拦截 + API·表黑名单命中拦截） */
  private hitsBlacklist(
    bwl: Awaited<ReturnType<SecurityPolicyService['blackWhiteList']>>,
    ctx: SecurityCheckContext,
  ): string | null {
    // 目录白名单：配置了白名单且文件路径不在任一白名单目录下 → 拦截（按路径分段边界，防前缀绕过）
    if (ctx.filePath) {
      const dirs = bwl.dirWhitelist.filter((i) => i.enabled).map((i) => i.value);
      if (dirs.length && !dirs.some((d) => this.isUnderDir(ctx.filePath!, d))) {
        return `目录不在白名单：${ctx.filePath}`;
      }
    }
    // API 路径黑名单
    if (ctx.apiPath) {
      const api = bwl.apiDbBlacklist.find((i) => i.enabled && ctx.apiPath!.includes(i.value));
      if (api) return `API 黑名单：${api.value}`;
    }
    // 数据库表字段黑名单
    if (ctx.actionType === 'database' && (ctx.sql || ctx.payload)) {
      const text = `${ctx.sql || ''} ${JSON.stringify(ctx.payload || {})}`.toLowerCase();
      const field = bwl.apiDbBlacklist.find((i) => i.enabled && text.includes(i.value.toLowerCase()));
      if (field) return `数据字段黑名单：${field.value}`;
    }
    return null;
  }

  /** 规则 9：敏感词命中处理（block/deny_memory 拦截；confirm 需确认；其余放行标审计） */
  private matchSensitive(
    ctx: SecurityCheckContext,
    rules: { pattern: string; action: string; type: string; enabled: boolean }[],
    matched: string[],
    risk: string,
  ): SecurityCheckResult | null {
    const text = this.contextText(ctx);
    for (const rule of rules) {
      if (!rule.enabled) continue;
      const keywords = rule.pattern.split('/').map((k) => k.trim().replace(/\*/g, '').toLowerCase()).filter(Boolean);
      if (!keywords.some((k) => text.includes(k))) continue;
      matched.push(`敏感词：${rule.type}`);
      if (rule.action === 'block' || rule.action === 'deny_memory') {
        return this.block(risk, `命中敏感词规则「${rule.type}」，${rule.action === 'block' ? '阻止执行' : '禁止写入记忆'}`, matched);
      }
      if (rule.action === 'confirm') {
        return { allowed: true, riskLevel: risk, requireApproval: false, requireConfirm: true, matchedPolicies: matched, auditRequired: true };
      }
      return { allowed: true, riskLevel: risk, requireApproval: false, requireConfirm: false, matchedPolicies: matched, auditRequired: true };
    }
    return null;
  }

  /** 规则 1-4：按风险等级配置的默认行为出结论 */
  private decideByRisk(
    risk: string,
    policies: { level: string; defaultAction: string; enabled: boolean }[],
    matched: string[],
  ): SecurityCheckResult {
    const policy = policies.find((p) => p.level === risk);
    matched.push(`风险等级默认行为：${risk}`);
    const audit = risk === 'L3' || risk === 'L4';
    const base = { riskLevel: risk, matchedPolicies: matched, auditRequired: audit };
    if (policy && !policy.enabled) {
      return { ...base, allowed: false, requireApproval: false, requireConfirm: false, blockedReason: `风险等级 ${risk} 已停用` };
    }
    const action = policy?.defaultAction ?? DEFAULT_ACTION_BY_LEVEL[risk];
    switch (action) {
      case 'allow':
        return { ...base, allowed: true, requireApproval: false, requireConfirm: false };
      case 'require_approval':
        return { ...base, allowed: true, requireApproval: true, requireConfirm: true };
      case 'deny':
        return { ...base, allowed: false, requireApproval: false, requireConfirm: false, blockedReason: `风险等级 ${risk} 默认拒绝执行` };
      default:
        return { ...base, allowed: false, requireApproval: false, requireConfirm: false, blockedReason: '未知默认行为' };
    }
  }

  /**
   * 按审计策略写审计日志：auditRequired 或被拒绝时记录。
   * 审计总开关关闭则跳过；开启脱敏则对 payload 做敏感字段掩码。
   */
  private async writeAuditIfNeeded(
    ctx: SecurityCheckContext,
    result: SecurityCheckResult,
    userId?: number,
  ): Promise<void> {
    if (!result.auditRequired && result.allowed) return;
    try {
      const audit = (await this.policy.getAudit()) as Record<string, unknown>;
      // 审计策略未强制、且非工具执行记录范围时可跳过；这里保守：只要 auditRequired 就记
      const mask = audit.maskSensitiveData !== false;
      await this.prisma.sysAgentAuditLog.create({
        data: {
          actionType: ctx.actionType,
          actionDesc: this.describeAction(ctx),
          riskLevel: result.riskLevel,
          allowed: result.allowed,
          requireApproval: result.requireApproval,
          matchedPolicies: result.matchedPolicies,
          blockedReason: result.blockedReason ?? null,
          userId: userId ?? null,
          skillKey: ctx.skillKey ?? null,
          toolKey: ctx.toolKey ?? null,
          // Prisma 可空 Json 字段用 undefined 跳过（不写入），不能传 null；
          // Record 需转 object 以满足 Prisma InputJsonValue（与 chat-setting 一致）
          maskedPayload: ((mask ? this.maskPayload(ctx.payload) : ctx.payload) ?? undefined) as
            | object
            | undefined,
        },
      });
    } catch {
      // 审计失败不阻断主流程
    }
  }

  /** 生成操作描述 */
  private describeAction(ctx: SecurityCheckContext): string {
    const detail = ctx.command || ctx.sql || ctx.filePath || ctx.apiPath || ctx.memoryFile || ctx.skillKey || ctx.toolKey || '';
    return `${ctx.actionType}: ${String(detail).slice(0, 200)}`;
  }

  /** 对 payload 中的敏感键做掩码（复用共享工具，与审批工单脱敏一致） */
  private maskPayload(payload?: Record<string, unknown>): Record<string, unknown> | null {
    return maskPayload(payload);
  }

  /** 审计日志分页列表 */
  async auditLogList(filter: { actionType?: string; allowed?: boolean; page?: number; pageSize?: number }) {
    const page = Math.max(filter.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filter.pageSize ?? 10, 1), 100);
    const where: Record<string, unknown> = {};
    if (filter.actionType) where.actionType = filter.actionType;
    if (typeof filter.allowed === 'boolean') where.allowed = filter.allowed;
    const [list, total] = await Promise.all([
      this.prisma.sysAgentAuditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysAgentAuditLog.count({ where }),
    ]);
    return { list, pagination: { page, pageSize, total } };
  }
}
