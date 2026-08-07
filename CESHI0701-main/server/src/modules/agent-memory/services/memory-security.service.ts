import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import {
  SecurityCheckService,
  SecurityCheckResult,
} from '@/modules/security-policy/services/security-check.service';

/** 记忆写入安全裁决结果（在 SecurityCheckResult 基础上叠加文件权限取严后的最终 requireConfirm） */
export interface MemoryWriteDecision extends SecurityCheckResult {
  /** 目标文件是否存在（不存在时其余字段无意义） */
  fileExists: boolean;
}

/** 需人工确认时抛出的业务错误标识（前端据此弹二次确认，带 confirmed 重提）。
 *  覆盖写入路径：save / confirmPending / applySuggestion / create / rollback（全路径 fail-closed）。 */
export const NEED_CONFIRM_CODE = 'MEMORY_NEED_CONFIRM';

/**
 * 记忆写入安全治理服务
 *
 * 记忆写入（保存/确认待确认/应用建议/自动写入）在实际改动 content 前，
 * 统一委托 SecurityCheckService.check(actionType='memory')，并与文件权限（needConfirm/canAutoWrite）
 * 取严，给出放行/需确认/需审批/拒绝的裁决。soul.md/user.md 命中 CONFIRM_MEMORY_FILES 强制确认。
 * checkWrite 仅裁决（供前端 /check 预判）；enforceWrite 按裁决放行或 fail-closed 抛错（供 service 写入前调用）。
 */
@Injectable()
export class MemorySecurityService {
  private readonly logger = new Logger(MemorySecurityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityCheck: SecurityCheckService,
  ) {}

  /**
   * 裁决核心：委托 SecurityCheckService 并与文件权限取严（不写库、不抛错）。
   * @param memoryKey 目标文件 key（审计/CONFIRM_MEMORY_FILES 匹配用）
   * @param text 拟写入内容（敏感词检测）
   * @param riskLevel 目标风险等级
   * @param needConfirm 目标文件 needConfirm 权限
   * @param canAutoWrite 目标文件 canAutoWrite 权限
   * @param userId 操作用户 ID
   */
  private async decide(
    memoryKey: string,
    text: string,
    riskLevel: string,
    needConfirm: boolean,
    canAutoWrite: boolean,
    userId?: number,
    dryRun?: boolean,
  ): Promise<MemoryWriteDecision> {
    const result = await this.securityCheck.check(
      { actionType: 'memory', memoryFile: memoryKey, riskLevel, payload: { content: text }, dryRun },
      userId,
    );
    // 与文件权限取严：安全策略要求确认，或（文件 needConfirm 且未开启低风险自动写入）→ 需确认
    const effectiveRequireConfirm = result.requireConfirm || (needConfirm && !canAutoWrite);
    return { ...result, requireConfirm: effectiveRequireConfirm, fileExists: true };
  }

  /** 文件不存在时的裁决占位 */
  private notFoundDecision(memoryKey: string): MemoryWriteDecision {
    return {
      fileExists: false,
      allowed: false,
      riskLevel: 'L1',
      requireApproval: false,
      requireConfirm: false,
      blockedReason: `记忆文件不存在: ${memoryKey}`,
      matchedPolicies: [],
      auditRequired: false,
    };
  }

  /**
   * 裁决一次对已存在文件的记忆写入。dryRun 语义：纯预判、不产生审计/审批工单副作用。
   * 供前端 /check 预览调用（dryRun=true）。文件不存在时返回 fileExists=false。
   * @param memoryKey 目标文件唯一键
   * @param text 拟写入内容
   * @param userId 操作用户 ID
   */
  async checkWrite(memoryKey: string, text: string, userId?: number): Promise<MemoryWriteDecision> {
    // 记忆文件按 (memoryKey,userId) 隔离；用户副本缺失时回退模板（userId=null）取风险/权限做预判
    const file = await this.prisma.sysAgentMemoryFile.findFirst({
      where: { memoryKey, OR: [{ userId: userId ?? undefined }, { userId: null }] },
    });
    if (!file) return this.notFoundDecision(memoryKey);
    // 预览：dryRun=true，避免每次预判都写审计/建审批工单
    return this.decide(memoryKey, text, file.riskLevel, file.needConfirm, file.canAutoWrite, userId, true);
  }

  /**
   * 按裁决结果 fail-closed 放行或抛错（拒绝/需审批/未确认均中止）。
   * @param decision 裁决结果
   * @param memoryKey 目标文件 key（错误提示用）
   * @param confirmed 前端二次确认标记
   */
  private enforceDecision(
    decision: MemoryWriteDecision,
    memoryKey: string,
    confirmed?: boolean,
  ): MemoryWriteDecision {
    if (!decision.allowed) {
      throw new BadRequestException(decision.blockedReason || '安全策略拒绝该记忆写入');
    }
    if (decision.requireApproval) {
      const ticket = decision.approvalRequestId ? `（审批工单 #${decision.approvalRequestId}）` : '';
      throw new BadRequestException(`该记忆写入需审批后执行${ticket}`);
    }
    if (decision.requireConfirm && !confirmed) {
      // fail-closed：未经二次确认不写入。前端应先调 /check 预判并弹确认框，再带 confirmed 重提。
      throw new BadRequestException({
        code: NEED_CONFIRM_CODE,
        message: `记忆写入「${memoryKey}」需人工确认`,
        matchedPolicies: decision.matchedPolicies,
      });
    }
    return decision;
  }

  /**
   * 强制执行「已存在文件」写入前置校验（fail-closed）。用于 save/confirm/apply/rollback。
   * @param memoryKey 目标文件唯一键
   * @param text 拟写入内容
   * @param userId 操作用户 ID
   * @param confirmed 前端二次确认标记（needConfirm 时须为 true 才放行）
   */
  async enforceWrite(
    memoryKey: string,
    text: string,
    userId?: number,
    confirmed?: boolean,
  ): Promise<MemoryWriteDecision> {
    const file = await this.prisma.sysAgentMemoryFile.findFirst({
      where: { memoryKey, OR: [{ userId: userId ?? undefined }, { userId: null }] },
    });
    if (!file) throw new BadRequestException(`记忆文件不存在: ${memoryKey}`);
    // 实际写入：dryRun=false，命中审批/敏感词时写审计、建工单（真实副作用）
    const decision = await this.decide(
      memoryKey,
      text,
      file.riskLevel,
      file.needConfirm,
      file.canAutoWrite,
      userId,
      false,
    );
    return this.enforceDecision(decision, memoryKey, confirmed);
  }

  /**
   * 强制执行「新建文件」写入前置校验（fail-closed）。文件尚不存在，按传入 riskLevel + 新建默认权限裁决。
   * @param memoryKey 新文件 key
   * @param text 新文件内容
   * @param riskLevel 新文件风险等级
   * @param needConfirm 新文件 needConfirm（默认 true）
   * @param canAutoWrite 新文件 canAutoWrite（默认 false）
   * @param userId 操作用户 ID
   * @param confirmed 前端二次确认标记
   */
  async enforceCreate(
    memoryKey: string,
    text: string,
    riskLevel: string,
    needConfirm: boolean,
    canAutoWrite: boolean,
    userId?: number,
    confirmed?: boolean,
  ): Promise<MemoryWriteDecision> {
    const decision = await this.decide(memoryKey, text, riskLevel, needConfirm, canAutoWrite, userId);
    return this.enforceDecision(decision, memoryKey, confirmed);
  }
}
