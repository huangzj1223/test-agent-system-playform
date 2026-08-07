import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

/** 单条读取埋点 */
export interface ReadLogItem {
  memoryKey?: string;
  memoryId?: number;
  hit?: boolean;
  sessionId?: string;
}

/**
 * 记忆读取日志服务（命中率数据来源）
 *
 * 对话构造上下文注入记忆时埋点：每个被读取的 enabled+canRead 记忆记一条 hit=true；
 * 无可用记忆时记一条 hit=false。stats.hitRate = 近 7 日 hit=true 比例（无数据返回「-」）。
 * 写入失败仅记日志、不抛出（埋点不阻断对话主流程）。
 */
@Injectable()
export class MemoryReadLogService {
  private readonly logger = new Logger(MemoryReadLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 批量记录读取埋点。memoryKey 存在时回填 memoryId（软关联，文件删除后日志仍留存快照）。
   * @param items 读取项列表
   * @param userId 操作用户 ID
   */
  async recordRead(items: ReadLogItem[], userId?: number): Promise<{ recorded: number }> {
    if (!Array.isArray(items) || items.length === 0) return { recorded: 0 };
    try {
      // 按 memoryKey 批量解析 memoryId（一次查询，避免逐条查库）
      const keys = Array.from(
        new Set(items.map((i) => i.memoryKey).filter((k): k is string => !!k)),
      );
      // 记忆已按 (memoryKey,userId) 隔离：解析 memoryId 必须限定当前用户的副本，
      // 否则会把埋点误关联到他人/模板的同名文件行（且 readLog→file 级联删除会牵连他人日志）。
      const files = keys.length
        ? await this.prisma.sysAgentMemoryFile.findMany({
            where: { memoryKey: { in: keys }, userId: userId ?? null },
            select: { id: true, memoryKey: true },
          })
        : [];
      const keyToId = new Map(files.map((f) => [f.memoryKey, f.id]));
      const data = items.map((i) => ({
        memoryKey: i.memoryKey ?? null,
        memoryId: i.memoryId ?? (i.memoryKey ? (keyToId.get(i.memoryKey) ?? null) : null),
        hit: i.hit ?? true,
        sessionId: i.sessionId ?? null,
        userId: userId ?? null,
      }));
      const res = await this.prisma.sysAgentMemoryReadLog.createMany({ data });
      return { recorded: res.count };
    } catch (e) {
      this.logger.error(`记录记忆读取埋点失败: ${(e as Error).message}`);
      return { recorded: 0 };
    }
  }

  /**
   * 近 N 日命中率文本：hit=true 计数 / 总计数，四舍五入百分比；无数据返回「-」。
   * @param days 统计窗口天数（默认 7）
   */
  async hitRate(days = 7): Promise<string> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [total, hits] = await Promise.all([
      this.prisma.sysAgentMemoryReadLog.count({ where: { createTime: { gte: since } } }),
      this.prisma.sysAgentMemoryReadLog.count({ where: { createTime: { gte: since }, hit: true } }),
    ]);
    if (total === 0) return '-';
    return `${Math.round((hits / total) * 100)}%`;
  }
}
