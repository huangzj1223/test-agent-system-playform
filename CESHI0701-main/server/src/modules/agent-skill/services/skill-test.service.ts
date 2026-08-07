import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma.service';
import {
  SecurityCheckService,
  type SecurityCheckResult,
} from '@/modules/security-policy/services/security-check.service';
import { AgentCapability, resolveCapability } from '../catalog/agent-capability.catalog';

/** 能力测试结果 */
export interface SkillTestResult {
  /** 是否成功（目标接口 2xx） */
  success: boolean;
  /** 耗时（毫秒） */
  durationMs: number;
  /** 结果摘要（目标接口响应体截断） */
  resultSummary: string;
  /** 被拦截原因（敏感能力等；成功时无） */
  blockedReason?: string;
}

/** 技能分类 → 安全策略 actionType（决定 check 的检测维度） */
const SKILL_CATEGORY_TO_ACTION: Record<string, string> = {
  query: 'api',
  generate: 'file',
  operation: 'api',
  cli: 'cli',
  decision: 'skill',
  workflow: 'skill',
};

/**
 * 技能能力测试服务（从 AgentSkillService 拆出，控制单文件体积）
 *
 * 在管理台验证技能引用的某能力是否可正常调用。安全设计：
 * - 只允许测试"属于该技能且已登记"的能力，杜绝任意能力/URL 调用（防越权/SSRF）；
 * - 敏感能力（写盘/改数据）禁止测试，避免测试入口成为绕过治理的后门；
 * - 进程内 self-call 转发调用者 Authorization，目标接口 @Auth+@Perms 守卫完整生效（真实边界）；
 * - 测试不写运行日志，避免污染 calls7d/failRate 真实使用统计。
 * - 执行前经 checkPolicy 委托 SecurityCheckService 统一治理（风险等级/黑白名单/敏感词/审批）。
 */
@Injectable()
export class SkillTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly securityCheck: SecurityCheckService,
  ) {}

  /**
   * 能力测试/试运行。
   * @param dto 测试入参（skillId + capabilityKey + params）
   * @param authorization 调用者 Authorization 头（转发给目标接口鉴权）
   */
  async testCapability(
    dto: { skillId: number; capabilityKey: string; params?: Record<string, unknown> },
    authorization?: string,
    userId?: number,
  ): Promise<SkillTestResult> {
    const skill = await this.prisma.sysAgentSkill.findUnique({ where: { id: dto.skillId } });
    if (!skill) {
      throw new BadRequestException(`技能不存在: ${dto.skillId}`);
    }
    const keys = Array.isArray(skill.capabilities) ? (skill.capabilities as string[]) : [];
    if (!keys.includes(dto.capabilityKey)) {
      throw new BadRequestException('该能力不属于此技能');
    }
    const cap = resolveCapability(dto.capabilityKey);
    if (!cap) {
      throw new BadRequestException('能力未登记或已下线');
    }
    if (cap.sensitive) {
      return {
        success: false,
        durationMs: 0,
        resultSummary: '',
        blockedReason: '敏感能力（写盘/改数据）禁止在测试入口执行',
      };
    }
    // 执行前经安全策略统一治理：被拦截（L4/黑名单/敏感词等）则不发起 self-call
    const policy = await this.checkPolicy(
      { skillKey: skill.skillKey, capabilityKey: dto.capabilityKey, payload: dto.params },
      userId,
    );
    if (!policy.allowed) {
      return {
        success: false,
        durationMs: 0,
        resultSummary: '',
        blockedReason: policy.blockedReason || `安全策略拦截（风险等级 ${policy.riskLevel}）`,
      };
    }
    return this.selfCallCapability(cap, dto.params ?? {}, authorization);
  }

  /**
   * 安全策略统一校验：委托 SecurityCheckService，按技能风险等级 + 分类映射的 actionType +
   * 载荷内容（命令/SQL/文件路径）判定是否放行/需确认/需审批/拦截，并按策略写审计日志。
   * 供测试入口与聊天执行前置校验（check 接口）复用。
   * @param dto 校验入参（skillKey + capabilityKey? + payload?）
   * @param userId 发起用户 ID（写审计用）
   */
  async checkPolicy(
    dto: { skillKey: string; capabilityKey?: string; payload?: Record<string, unknown> },
    userId?: number,
  ): Promise<SecurityCheckResult> {
    const skill = await this.prisma.sysAgentSkill.findUnique({ where: { skillKey: dto.skillKey } });
    if (!skill) {
      throw new BadRequestException(`技能不存在: ${dto.skillKey}`);
    }
    const actionType = SKILL_CATEGORY_TO_ACTION[skill.category] ?? 'skill';
    const p = (dto.payload ?? {}) as Record<string, unknown>;
    return this.securityCheck.check(
      {
        actionType,
        riskLevel: skill.riskLevel,
        command: typeof p.command === 'string' ? p.command : undefined,
        sql: typeof p.sql === 'string' ? p.sql : undefined,
        apiPath: typeof p.apiPath === 'string' ? p.apiPath : undefined,
        filePath: typeof p.filePath === 'string' ? p.filePath : undefined,
        skillKey: dto.skillKey,
        toolKey: dto.capabilityKey,
        payload: dto.payload,
      },
      userId,
    );
  }

  /**
   * 进程内 self-call 转调能力目标接口（method+path 来自 vetted catalog），转发鉴权头。
   * 注意：resultSummary 会原样截断回显目标接口响应体给测试者；
   * 新增能力时需自行评估其响应内容是否含敏感数据（当前 3 个只读能力返回表结构，对管理员非越权）。
   * @param cap 能力定义
   * @param params 调用参数
   * @param authorization 调用者鉴权头
   */
  private async selfCallCapability(
    cap: AgentCapability,
    params: Record<string, unknown>,
    authorization?: string,
  ): Promise<SkillTestResult> {
    const port = this.config.get<number>('SERVER_PORT', 9001);
    const url = `http://127.0.0.1:${port}${cap.path}`;
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        method: cap.method,
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {}),
        },
        // 仅 POST 传 body；GET 能力暂不支持带参（当前 catalog 能力均为 POST）
        body: cap.method === 'POST' ? JSON.stringify(params) : undefined,
        signal: controller.signal,
      });
      const durationMs = Date.now() - startedAt;
      const text = await res.text();
      const summary = text.length > 300 ? `${text.slice(0, 300)}…` : text;
      return { success: res.ok, durationMs, resultSummary: summary };
    } catch (e) {
      return {
        success: false,
        durationMs: Date.now() - startedAt,
        resultSummary:
          (e as Error)?.name === 'AbortError' ? '调用超时（15s）' : ((e as Error)?.message ?? '调用失败'),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
