import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { bumpVersion } from '../catalog/agent-memory.enums';

/** 变更类型白名单（DB 层为裸 String，写入侧在此校验；rollback 亦经安全治理） */
export const MEMORY_CHANGE_TYPES = ['create', 'update', 'rollback', 'confirm', 'suggestion'] as const;
export type MemoryChangeType = (typeof MEMORY_CHANGE_TYPES)[number];

/**
 * 记忆版本历史服务（从 AgentMemoryService 拆出，控制单文件体积）
 *
 * 职责：每次记忆写入写内容快照到 sys_agent_memory_version；提供版本列表与回滚。
 * 回滚 = 用历史快照 content 覆盖当前文件内容，version 继续递增（不倒退），
 * 并再记一条 rollback 快照，形成可追溯链（不做物理删除）。
 */
@Injectable()
export class MemoryVersionService {
  private readonly logger = new Logger(MemoryVersionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 写一条版本快照。失败仅记日志、不抛出（不阻断主流程的记忆写入）。
   * @param file 记忆文件当前行（含 id/version/content）
   * @param changeType 变更类型
   * @param note 变更说明
   * @param updater 更新人
   */
  async writeSnapshot(
    file: { id: number; version: string; content: string },
    changeType: MemoryChangeType,
    note?: string,
    updater?: string,
  ): Promise<void> {
    try {
      await this.prisma.sysAgentMemoryVersion.create({
        data: {
          memoryId: file.id,
          version: file.version ?? 'v1.0.0',
          content: file.content ?? '',
          changeType,
          note: note ? note.slice(0, 300) : null,
          updater: updater ?? null,
        },
      });
    } catch (e) {
      this.logger.error(`写记忆版本快照失败(memoryId=${file.id}): ${(e as Error).message}`);
    }
  }

  /**
   * 某记忆文件的版本历史分页（按时间倒序）。
   * @param memoryKey 记忆文件唯一键
   * @param page 页码
   * @param pageSize 每页条数
   */
  async listVersions(memoryKey: string, userId: number, page = 1, pageSize = 20) {
    const file = await this.prisma.sysAgentMemoryFile.findFirst({ where: { memoryKey, userId } });
    if (!file) throw new BadRequestException(`记忆文件不存在: ${memoryKey}`);
    const p = Math.max(page, 1);
    const ps = Math.min(Math.max(pageSize, 1), 100);
    const [rows, total] = await Promise.all([
      this.prisma.sysAgentMemoryVersion.findMany({
        where: { memoryId: file.id },
        skip: (p - 1) * ps,
        take: ps,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysAgentMemoryVersion.count({ where: { memoryId: file.id } }),
    ]);
    const list = rows.map((v) => ({
      id: v.id,
      version: v.version,
      time: this.fmtTime(v.createTime),
      updater: v.updater ?? '',
      note: v.note ?? '',
      changeType: v.changeType,
      current: v.version === file.version,
      content: v.content,
    }));
    return { list, pagination: { page: p, pageSize: ps, total } };
  }

  /**
   * 回滚到指定历史版本：用其快照 content 覆盖当前文件内容，version 继续递增（不倒退），
   * 并记一条 rollback 快照。按 (memoryKey, version) 定位快照（同版本多条取最新）。
   * @param memoryKey 记忆文件唯一键
   * @param version 目标历史版本号
   * @param updater 操作者
   */
  async rollback(memoryKey: string, version: string, updater?: string, userId?: number) {
    const file = await this.prisma.sysAgentMemoryFile.findFirst({ where: { memoryKey, userId } });
    if (!file) throw new BadRequestException(`记忆文件不存在: ${memoryKey}`);
    const ver = await this.prisma.sysAgentMemoryVersion.findFirst({
      where: { memoryId: file.id, version },
      orderBy: { createTime: 'desc' },
    });
    if (!ver) throw new BadRequestException(`版本不存在或不属于该文件: ${version}`);

    // 个人文件无安全拦截（每用户独立，回滚仅影响自己）——直接覆盖
    const nextVersion = bumpVersion(file.version);
    const updated = await this.prisma.sysAgentMemoryFile.update({
      where: { id: file.id },
      data: { content: ver.content, version: nextVersion, updater: updater ?? file.updater },
    });
    await this.writeSnapshot(updated, 'rollback', `回滚自 ${version}`, updater);
    return updated;
  }

  /** 格式化为 yyyy-MM-dd HH:mm */
  private fmtTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
