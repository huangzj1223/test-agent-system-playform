import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma.service';
import { bumpVersion } from '../catalog/agent-memory.enums';
import { MemoryVersionService } from './memory-version.service';
import { AgentMemoryService } from './agent-memory.service';

/**
 * 待确认记忆 + 模型建议服务（从 AgentMemoryService 拆出，控制单文件体积）
 *
 * 职责：
 * - 待确认记忆（pending）：列表 / 确认（追加到目标文件）/ 忽略
 * - 模型建议（suggestion）：列表 / 应用（追加到所属文件）/ 忽略
 * 确认与应用都会：追加内容到目标文件末尾 + version 递增 + 写版本快照（confirm/suggestion）。
 * 安全策略统一治理（写入前 check）在阶段 5 接入，本服务预留调用点 TODO。
 */
/** 单用户「待确认记忆」队列上限：防对话侧端点被反复调用灌爆队列淹没管理员 */
const MAX_PENDING_PER_USER = 50;

@Injectable()
export class MemorySuggestionService {
  private readonly logger = new Logger(MemorySuggestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly versionService: MemoryVersionService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  /**
   * 新建待确认记忆（对话侧智能体 memory.suggest 工具入口）。
   *
   * 仅入队 status=pending，不改动任何记忆文件——真正追加到文件在管理员 confirmPending 时发生
   * （届时过 enforceWrite 全套 fail-closed 裁决）。故此处只做「入队前」轻量守门：
   * - 目标文件须存在；
   * - 目标文件须开启 canSuggest（"允许模型建议修改"），否则拒绝入队；
   * - 过一次 dryRun 安全裁决，命中拒绝类策略（敏感词/风险 deny）的内容不许入队，
   *   避免待确认队列被明显违规内容污染（needConfirm/审批留到 confirm 阶段处理）。
   * @param text 建议内容
   * @param targetKey 目标文件 key
   * @param source 来源说明（可空）
   * @param userId 提交用户 ID（归属）
   */
  async createPending(text: string, targetKey: string, source?: string, userId?: number) {
    const content = text.trim();
    if (!content) throw new BadRequestException('建议内容不能为空');

    // 目标文件：匹配当前用户的个人副本或出厂模板（canSuggest 在两者一致；用户可能尚未物化副本）
    const file = await this.prisma.sysAgentMemoryFile.findFirst({
      where: { memoryKey: targetKey, OR: [{ userId: userId ?? undefined }, { userId: null }] },
    });
    if (!file) throw new BadRequestException(`目标记忆文件不存在: ${targetKey}`);
    if (!file.canSuggest) {
      throw new BadRequestException(`记忆文件「${targetKey}」未开启模型建议（canSuggest）`);
    }
    // 个人文件无安全拦截：待确认仅入队，确认由用户本人操作，不做 dryRun 门控

    const src = source?.trim() || null;
    const data = { text: content, targetKey, source: src, status: 'pending', userId: userId ?? null };

    // 匿名场景（正常不会发生：端点经 AuthGuard，userId 必有值）不设防刷闸，直接入队
    if (userId == null) {
      const created = await this.prisma.sysAgentMemoryPending.create({ data });
      return { id: `pd-${created.id}`, targetKey };
    }

    // 防刷（对话侧端点无 @Perms，仅登录即可调用）：以下两道闸限制单用户对待确认队列的写入，
    // 避免模型反复调用或恶意用户灌爆队列淹没管理员真正需处理的建议。
    // 去重(读) + 配额(读) + 入队(写) 必须原子，否则并发刷接口时各请求都读到"未满/无重复"再各自插入，
    // 闸门形同虚设（TOCTOU）。故包进 Serializable 事务：并发请求被串行化，闸门在每次判断时看到最新状态。
    return this.prisma.$transaction(
      async (tx) => {
        // 1) 幂等去重：同用户 + 同目标 + 同内容已有 pending 记录时不重复入队，返回既有记录
        const dup = await tx.sysAgentMemoryPending.findFirst({
          where: { userId, targetKey, text: content, status: 'pending' },
        });
        if (dup) return { id: `pd-${dup.id}`, targetKey };

        // 2) 每用户待确认配额上限：超过则拒绝，提示先到记忆中心处理存量
        const pendingCount = await tx.sysAgentMemoryPending.count({
          where: { userId, status: 'pending' },
        });
        if (pendingCount >= MAX_PENDING_PER_USER) {
          throw new BadRequestException(
            `待确认记忆已达上限（${MAX_PENDING_PER_USER} 条），请先在记忆中心确认或忽略部分建议后再提交`,
          );
        }

        const created = await tx.sysAgentMemoryPending.create({ data });
        return { id: `pd-${created.id}`, targetKey };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /** 待确认记忆列表（仅当前用户，status=pending，按时间倒序） */
  async listPending(userId: number) {
    const rows = await this.prisma.sysAgentMemoryPending.findMany({
      where: { status: 'pending', userId },
      orderBy: { createTime: 'desc' },
    });
    return rows.map((p) => ({
      id: `pd-${p.id}`,
      text: p.text,
      target: p.targetKey,
      source: p.source ?? '',
    }));
  }

  /**
   * 确认待确认记忆：把内容追加到目标文件末尾，写 confirm 快照，pending 置 confirmed。
   * @param pendingId 待确认记录 ID
   * @param text 可选覆盖文本（编辑后确认）
   * @param updater 操作者
   */
  async confirmPending(pendingId: number, text?: string, updater?: string, userId?: number) {
    const pending = await this.prisma.sysAgentMemoryPending.findUnique({ where: { id: pendingId } });
    if (!pending || pending.status !== 'pending') {
      throw new BadRequestException('待确认记忆不存在或已处理');
    }
    // 归属校验：只能确认本人的待确认记忆
    if (pending.userId !== (userId ?? null)) {
      throw new BadRequestException('待确认记忆不存在或已处理');
    }
    // 仅能确认到本人的文件副本（个人隔离）；副本可能尚未物化，确保存在
    await this.memoryService.ensureUserFiles(userId as number);
    const file = await this.prisma.sysAgentMemoryFile.findFirst({
      where: { memoryKey: pending.targetKey, userId },
    });
    if (!file) throw new BadRequestException(`目标记忆文件不存在: ${pending.targetKey}`);

    const content = (text ?? pending.text).trim() || pending.text;
    // 个人文件无安全拦截：直接追加到本人文件
    const updated = await this.appendContent(file, content);
    await this.versionService.writeSnapshot(updated, 'confirm', '确认待确认记忆', updater);
    await this.prisma.sysAgentMemoryPending.update({
      where: { id: pendingId },
      data: { status: 'confirmed', handleTime: new Date() },
    });
    return { memoryKey: file.memoryKey, version: updated.version };
  }

  /** 忽略待确认记忆（仅本人，status=ignored） */
  async ignorePending(pendingId: number, userId: number) {
    const pending = await this.prisma.sysAgentMemoryPending.findUnique({ where: { id: pendingId } });
    if (!pending || pending.status !== 'pending' || pending.userId !== (userId ?? null)) {
      throw new BadRequestException('待确认记忆不存在或已处理');
    }
    await this.prisma.sysAgentMemoryPending.update({
      where: { id: pendingId },
      data: { status: 'ignored', handleTime: new Date() },
    });
    return { id: `pd-${pendingId}` };
  }

  /** 某文件的模型建议列表（当前用户副本，status=pending，按时间倒序） */
  async listSuggestions(memoryKey: string, userId: number) {
    const file = await this.prisma.sysAgentMemoryFile.findFirst({ where: { memoryKey, userId } });
    if (!file) throw new BadRequestException(`记忆文件不存在: ${memoryKey}`);
    const rows = await this.prisma.sysAgentMemorySuggestion.findMany({
      where: { memoryId: file.id, status: 'pending' },
      orderBy: { createTime: 'desc' },
    });
    return rows.map((s) => ({ id: `sg-${s.id}`, text: s.text, source: s.source ?? '' }));
  }

  /**
   * 应用模型建议：把内容追加到所属文件末尾，写 suggestion 快照，建议置 applied。
   * @param suggestionId 建议记录 ID
   * @param text 可选覆盖文本（编辑后应用）
   * @param updater 操作者
   */
  async applySuggestion(suggestionId: number, text?: string, updater?: string, userId?: number) {
    const sug = await this.prisma.sysAgentMemorySuggestion.findUnique({ where: { id: suggestionId } });
    if (!sug || sug.status !== 'pending') {
      throw new BadRequestException('模型建议不存在或已处理');
    }
    // 建议归属校验：只能应用到本人的文件副本
    const file = await this.prisma.sysAgentMemoryFile.findFirst({ where: { id: sug.memoryId, userId } });
    if (!file) throw new BadRequestException('建议所属记忆文件不存在');

    const content = (text ?? sug.text).trim() || sug.text;
    // 个人文件无安全拦截：直接追加到所属文件
    const updated = await this.appendContent(file, content);
    await this.versionService.writeSnapshot(updated, 'suggestion', '应用模型建议', updater);
    await this.prisma.sysAgentMemorySuggestion.update({
      where: { id: suggestionId },
      data: { status: 'applied', handleTime: new Date() },
    });
    return { memoryKey: file.memoryKey, version: updated.version };
  }

  /** 忽略模型建议（仅本人所属文件的建议，status=ignored） */
  async ignoreSuggestion(suggestionId: number, userId: number) {
    const sug = await this.prisma.sysAgentMemorySuggestion.findUnique({ where: { id: suggestionId } });
    if (!sug || sug.status !== 'pending') {
      throw new BadRequestException('模型建议不存在或已处理');
    }
    // 归属校验：建议所属文件须为本人副本
    const owned = await this.prisma.sysAgentMemoryFile.findFirst({ where: { id: sug.memoryId, userId } });
    if (!owned) throw new BadRequestException('模型建议不存在或已处理');
    await this.prisma.sysAgentMemorySuggestion.update({
      where: { id: suggestionId },
      data: { status: 'ignored', handleTime: new Date() },
    });
    return { id: `sg-${suggestionId}` };
  }

  /** 把一行内容追加到文件末尾（"\n\n- 内容"），version 递增，返回更新后文件 */
  private async appendContent(file: { id: number; content: string; version: string; updater: string | null }, content: string) {
    return this.prisma.sysAgentMemoryFile.update({
      where: { id: file.id },
      data: {
        content: `${file.content}\n\n- ${content}`,
        version: bumpVersion(file.version),
        updater: file.updater ?? 'AG-UI 智能体',
      },
    });
  }
}
