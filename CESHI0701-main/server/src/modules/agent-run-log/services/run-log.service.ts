import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { isOwnRunLogType, isValidRunLogStatus, RUN_LOG_ID_PREFIX } from '../catalog/agent-run-log.enums';

/** 写入运行日志的入参（仅 conversation/system/error 三类） */
export interface RecordRunLogInput {
  type: string;
  status: string;
  summary: string;
  sessionId?: string;
  requestId?: string;
  agentName?: string;
  durationMs?: number;
  userId?: number;
  userName?: string;
  sourcePage?: string;
  riskLevel?: string;
  detail?: Record<string, any>;
}

/**
 * 运行日志写入服务
 *
 * 仅负责写 sys_agent_run_log 的 conversation/system/error 三类（无独立源表的类型）。
 * skill/tool/memory 由各自模块写明细表，不经此服务。
 * 埋点采用 fire-and-forget：写入失败只记日志、绝不抛出，避免拖垮业务主流程。
 */
@Injectable()
export class RunLogService {
  private readonly logger = new Logger(RunLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录一条运行日志（conversation/system/error）。
   * 失败静默（仅告警），返回是否成功，调用方无需 await 也无需处理异常。
   * @returns 写入成功返回带前缀 id，失败返回 null
   */
  async record(input: RecordRunLogInput): Promise<string | null> {
    try {
      if (!isOwnRunLogType(input.type)) {
        this.logger.warn(`run-log record 忽略非本表类型: ${input.type}`);
        return null;
      }
      if (!isValidRunLogStatus(input.status)) {
        this.logger.warn(`run-log record 非法状态: ${input.status}`);
        return null;
      }
      const now = new Date();
      const created = await this.prisma.sysAgentRunLog.create({
        data: {
          type: input.type,
          status: input.status,
          summary: input.summary?.slice(0, 500) ?? '',
          sessionId: input.sessionId ?? null,
          requestId: input.requestId ?? null,
          agentName: input.agentName ?? null,
          startedAt: now,
          endedAt: input.status === 'running' ? null : now,
          durationMs: input.durationMs ?? 0,
          userId: input.userId ?? null,
          userName: input.userName ?? null,
          sourcePage: input.sourcePage ?? null,
          riskLevel: input.riskLevel ?? null,
          detail: input.detail ?? undefined,
        },
      });
      return `${RUN_LOG_ID_PREFIX.own}${created.id}`;
    } catch (e) {
      // fire-and-forget：不抛出，避免影响业务主流程
      this.logger.error(`run-log record 写入失败: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * 标记 error/本表日志为已处理。
   * @param prefixedId 须为 run- 前缀的本表记录
   */
  async markProcessed(prefixedId: string): Promise<boolean> {
    if (!prefixedId.startsWith(RUN_LOG_ID_PREFIX.own)) return false;
    const rawId = Number(prefixedId.slice(RUN_LOG_ID_PREFIX.own.length));
    if (!Number.isInteger(rawId)) return false;
    try {
      await this.prisma.sysAgentRunLog.update({
        where: { id: rawId },
        data: { processed: true },
      });
      return true;
    } catch (e) {
      this.logger.error(`run-log markProcessed 失败: ${(e as Error).message}`);
      return false;
    }
  }
}
