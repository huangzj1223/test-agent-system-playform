import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { SecurityPolicyService } from './security-policy.service';
import { maskPayload } from '../util/mask-payload';

/** 创建审批工单入参 */
export interface CreateApprovalRequestInput {
  actionType: string;
  targetDesc: string;
  riskLevel: string;
  payload?: Record<string, unknown>;
  requesterId?: number;
  skillKey?: string;
  toolKey?: string;
}

/**
 * 审批工单服务
 *
 * 安全校验命中「需人工审批」时创建 pending 工单，支撑发起→待审→通过/拒绝/超时流转。
 * 超时时间按命中的审批规则 timeoutMinutes 计算；超时扫描按规则 timeoutAction 处理。
 */
@Injectable()
export class ApprovalRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: SecurityPolicyService,
  ) {}

  /**
   * 创建审批工单：按 actionType 匹配启用的审批规则确定超时时长，无匹配用默认 30 分钟。
   * @param input 工单信息
   */
  async createRequest(input: CreateApprovalRequestInput): Promise<{ id: number }> {
    const rule = await this.matchRule(input.actionType, input.riskLevel);
    const timeoutMinutes = rule?.timeoutMinutes ?? 30;
    const expireAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    const created = await this.prisma.sysAgentApprovalRequest.create({
      data: {
        ruleId: rule?.id ?? null,
        actionType: input.actionType,
        targetDesc: input.targetDesc.slice(0, 300),
        riskLevel: input.riskLevel,
        // 纵深防御：无论调用方是否已脱敏，落库前再脱敏一次，确保工单不存明文敏感值
        payload: (maskPayload(input.payload) ?? undefined) as object | undefined,
        status: 'pending',
        requesterId: input.requesterId ?? null,
        expireAt,
      },
    });
    return { id: created.id };
  }

  /**
   * 匹配启用的审批规则：actionType 映射到规则 scope，且规则 riskLevels 含当前风险等级。
   * scope 是中文范围名（如「CLI 工具」），actionType 是英文键，用映射表对齐。
   */
  private async matchRule(actionType: string, riskLevel: string) {
    const SCOPE_MAP: Record<string, string> = {
      cli: 'CLI 工具',
      api: 'API 接口',
      database: '数据库',
      file: '文件系统',
      page: '页面操作',
      memory: '记忆写入',
      skill: 'Skill 执行',
    };
    const scope = SCOPE_MAP[actionType];
    const rules = await this.prisma.sysAgentApprovalRule.findMany({
      where: { enabled: true, ...(scope ? { scope } : {}) },
      orderBy: { sort: 'asc' },
    });
    return rules.find((r) => {
      const levels = Array.isArray(r.riskLevels) ? (r.riskLevels as string[]) : [];
      return levels.includes(riskLevel);
    });
  }

  /**
   * 工单列表（筛选 + 分页）
   * @param filter 状态/操作类型/分页
   */
  async listRequest(filter: { status?: string; actionType?: string; page?: number; pageSize?: number }) {
    const page = Math.max(filter.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filter.pageSize ?? 10, 1), 100);
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.actionType) where.actionType = filter.actionType;
    const [list, total] = await Promise.all([
      this.prisma.sysAgentApprovalRequest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysAgentApprovalRequest.count({ where }),
    ]);
    return { list, pagination: { page, pageSize, total } };
  }

  /**
   * 审批决策：仅 pending 工单可决策，更新状态 + 审批人 + 决策时间。
   * @param id 工单 ID
   * @param decision approved / rejected
   * @param approverId 审批人 ID
   * @param remark 审批意见
   */
  async decide(id: number, decision: 'approved' | 'rejected', approverId?: number, remark?: string): Promise<void> {
    const req = await this.prisma.sysAgentApprovalRequest.findUnique({ where: { id } });
    if (!req) throw new BadRequestException(`审批工单不存在: ${id}`);
    if (req.status !== 'pending') throw new BadRequestException(`工单当前状态为 ${req.status}，不可再次决策`);
    await this.prisma.sysAgentApprovalRequest.update({
      where: { id },
      data: {
        status: decision,
        approverId: approverId ?? null,
        approveRemark: remark ? remark.slice(0, 500) : null,
        decidedAt: new Date(),
      },
    });
  }

  /**
   * 超时扫描：处理已过 expireAt 的 pending 工单，按其规则 timeoutAction 落状态。
   * approve→approved / deny→rejected / cancel→cancelled / wait→保持 pending。
   * @returns 处理条数
   */
  async checkTimeout(): Promise<{ processed: number }> {
    const now = new Date();
    const expired = await this.prisma.sysAgentApprovalRequest.findMany({
      where: { status: 'pending', expireAt: { lt: now } },
    });
    let processed = 0;
    for (const req of expired) {
      const action = req.ruleId ? await this.ruleTimeoutAction(req.ruleId) : 'deny';
      const nextStatus = this.timeoutToStatus(action);
      if (!nextStatus) continue; // wait：保持等待
      await this.prisma.sysAgentApprovalRequest.update({
        where: { id: req.id },
        data: { status: nextStatus, decidedAt: now, approveRemark: '超时自动处理' },
      });
      processed++;
    }
    return { processed };
  }

  /** 取规则的超时处理方式，规则已删则默认 deny */
  private async ruleTimeoutAction(ruleId: number): Promise<string> {
    const rule = await this.prisma.sysAgentApprovalRule.findUnique({ where: { id: ruleId } });
    return rule?.timeoutAction ?? 'deny';
  }

  /** 超时处理方式 → 工单终态（wait 返回 null 表示不变更） */
  private timeoutToStatus(action: string): string | null {
    switch (action) {
      case 'approve':
        return 'approved';
      case 'deny':
        return 'rejected';
      case 'cancel':
        return 'cancelled';
      default:
        return null; // wait
    }
  }
}
