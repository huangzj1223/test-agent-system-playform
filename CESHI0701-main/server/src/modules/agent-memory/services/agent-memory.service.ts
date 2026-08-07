import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';
import { HIGH_RISK_LEVELS, bumpVersion } from '../catalog/agent-memory.enums';
import {
  BUILTIN_MEMORIES,
  BuiltinMemorySeed,
} from '../catalog/builtin-memory.seed';
import { MemoryVersionService } from './memory-version.service';
import { MemorySecurityService } from './memory-security.service';
import { MemoryReadLogService } from './memory-readlog.service';

/** 注入对话的记忆拼接总长上限（字符）：防多文件全量拼接撑爆模型上下文/推高成本 */
const MEMORY_INJECT_MAX_LEN = 20000;
/** 记忆块之间的分隔符（Markdown 水平线） */
const MEMORY_INJECT_SEP = '\n\n---\n\n';

/** 记忆文件列表筛选条件 */
export interface MemoryListFilter {
  keyword?: string;
  category?: string;
  riskLevel?: string;
  enabled?: boolean;
}

/** 权限配置对象（组装给前端，与 SysAgentMemoryFile 扁平列一一对应） */
export interface MemoryPermissionView {
  enabled: boolean;
  canRead: boolean;
  canSuggest: boolean;
  canAutoWrite: boolean;
  needConfirm: boolean;
  auditLog: boolean;
}

/**
 * 记忆中心服务
 *
 * 管理 SysAgentMemoryFile 的读取（列表/统计/详情），并在启动时幂等写入 5 个内置记忆文件
 * （含版本快照、模型建议）与初始待确认记忆。内置文件 builtin=true，不覆盖用户后续修改。
 */
@Injectable()
export class AgentMemoryService extends BaseService implements OnModuleInit {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(
    protected prisma: PrismaService,
    private readonly versionService: MemoryVersionService,
    private readonly securityService: MemorySecurityService,
    private readonly readLogService: MemoryReadLogService,
  ) {
    super(prisma, 'sysAgentMemoryFile');
  }

  /** 启动时幂等初始化内置记忆文件（按 memoryKey 判存，存在则跳过） */
  async onModuleInit(): Promise<void> {
    try {
      for (const seed of BUILTIN_MEMORIES) {
        // 模板行 userId=null；存在则跳过（幂等）。各用户的个人副本由 ensureUserFiles 首访时克隆。
        const exists = await this.prisma.sysAgentMemoryFile.findFirst({
          where: { memoryKey: seed.memoryKey, userId: null },
        });
        if (exists) continue;
        await this.createBuiltinFile(seed);
      }
      // 不再种入示例待确认记忆：记忆已按用户隔离，userId=null 的待确认对任何用户都不可见/不可确认。
      // 真实待确认由对话侧 memory.suggest 以当前用户身份产生。
      this.logger.log('已初始化内置记忆文件（soul/user/memory/skill-memory/tool-memory）');
    } catch (e) {
      // 初始化失败不应阻断应用启动，记录待排查
      this.logger.error(`内置记忆初始化失败: ${(e as Error).message}`);
    }
  }

  /** 创建单个内置文件及其版本快照、模型建议 */
  private async createBuiltinFile(seed: BuiltinMemorySeed): Promise<void> {
    const file = await this.prisma.sysAgentMemoryFile.create({
      data: {
        memoryKey: seed.memoryKey,
        userId: null, // 模板行：各用户首访时据此克隆个人副本
        name: seed.name,
        description: seed.description,
        subtitle: seed.subtitle,
        content: seed.content,
        category: 'internal',
        riskLevel: seed.riskLevel,
        version: seed.version,
        enabled: seed.permission.enabled,
        canRead: seed.permission.canRead,
        canSuggest: seed.permission.canSuggest,
        canAutoWrite: seed.permission.canAutoWrite,
        needConfirm: seed.permission.needConfirm,
        auditLog: seed.permission.auditLog,
        relatedIds: seed.relatedIds,
        builtin: true,
        sort: seed.sort,
        creator: seed.creator,
        updater: seed.updater,
      },
    });
    if (seed.versions.length > 0) {
      await this.prisma.sysAgentMemoryVersion.createMany({
        data: seed.versions.map((v) => ({
          memoryId: file.id,
          version: v.version,
          content: v.content,
          changeType: v.changeType,
          note: v.note,
          updater: v.updater,
        })),
      });
    }
    if (seed.suggestions.length > 0) {
      await this.prisma.sysAgentMemorySuggestion.createMany({
        data: seed.suggestions.map((s) => ({
          memoryId: file.id,
          text: s.text,
          source: s.source ?? null,
        })),
      });
    }
  }

  /**
   * 确保某用户拥有全部记忆文件的个人副本：以 userId=null 模板为源，克隆缺失的文件。
   * 幂等：createMany + skipDuplicates，配合 (memoryKey,userId) 复合唯一，兜住并发首访。
   * 读/列/注入/写路径进入前调用，实现"老用户首次访问即自愈物化"。
   * @param userId 目标用户 ID
   */
  async ensureUserFiles(userId: number): Promise<void> {
    if (!userId) return;
    const templates = await this.prisma.sysAgentMemoryFile.findMany({ where: { userId: null } });
    if (templates.length === 0) return;
    const owned = await this.prisma.sysAgentMemoryFile.findMany({
      where: { userId },
      select: { memoryKey: true },
    });
    const have = new Set(owned.map((o) => o.memoryKey));
    const toClone = templates.filter((t) => !have.has(t.memoryKey));
    if (toClone.length === 0) return;
    await this.prisma.sysAgentMemoryFile.createMany({
      data: toClone.map((t) => ({
        memoryKey: t.memoryKey,
        userId,
        name: t.name,
        description: t.description,
        subtitle: t.subtitle,
        content: t.content,
        category: t.category,
        riskLevel: t.riskLevel,
        version: t.version,
        enabled: t.enabled,
        canRead: t.canRead,
        canSuggest: t.canSuggest,
        canAutoWrite: t.canAutoWrite,
        needConfirm: t.needConfirm,
        auditLog: t.auditLog,
        // relatedIds 为 JSON 可空列：为 null 时省略（落库为 null），非空原样克隆
        ...(t.relatedIds != null ? { relatedIds: t.relatedIds } : {}),
        builtin: t.builtin,
        sort: t.sort,
        creator: t.creator,
        updater: t.updater,
      })),
      skipDuplicates: true,
    });
    // 为刚克隆出的个人副本补一条 create 初始版本快照，使详情页有版本历史、"当前版本"标记生效。
    // 只对「尚无任何版本」的副本补（并发下另一次调用可能已补过），避免重复。
    const clonedKeys = toClone.map((t) => t.memoryKey);
    const fresh = await this.prisma.sysAgentMemoryFile.findMany({
      where: { userId, memoryKey: { in: clonedKeys }, versions: { none: {} } },
      select: { id: true, version: true, content: true },
    });
    if (fresh.length > 0) {
      await this.prisma.sysAgentMemoryVersion.createMany({
        data: fresh.map((f) => ({
          memoryId: f.id,
          version: f.version ?? 'v1.0.0',
          content: f.content ?? '',
          changeType: 'create',
          note: '初始创建（个人副本）',
          updater: 'AG-UI 智能体',
        })),
      });
    }
  }

  /** 把记忆文件行的扁平权限列组装为 permission 对象（前端按对象消费） */
  private toView(file: any) {
    const permission: MemoryPermissionView = {
      enabled: file.enabled,
      canRead: file.canRead,
      canSuggest: file.canSuggest,
      canAutoWrite: file.canAutoWrite,
      needConfirm: file.needConfirm,
      auditLog: file.auditLog,
    };
    return {
      id: file.memoryKey, // 前端以 memoryKey 作为文件标识
      memoryKey: file.memoryKey,
      name: file.name,
      desc: file.description ?? '',
      subtitle: file.subtitle ?? '',
      enabled: file.enabled,
      version: file.version,
      content: file.content,
      category: file.category,
      riskLevel: file.riskLevel,
      creator: file.creator ?? '',
      updater: file.updater ?? '',
      createTime: this.fmtTime(file.createTime),
      lastUpdate: this.fmtTime(file.updateTime),
      updatedAt: this.relativeTime(file.updateTime),
      relatedIds: Array.isArray(file.relatedIds) ? file.relatedIds : [],
      builtin: file.builtin,
      sort: file.sort,
      permission,
    };
  }

  /** 记忆文件列表（当前用户的个人副本，筛选，按 sort 升序） */
  async listWithFilter(filter: MemoryListFilter, userId: number) {
    await this.ensureUserFiles(userId);
    const where: any = { userId };
    if (filter.keyword) {
      where.OR = [
        { name: { contains: filter.keyword } },
        { description: { contains: filter.keyword } },
      ];
    }
    if (filter.category) where.category = filter.category;
    if (filter.riskLevel) where.riskLevel = filter.riskLevel;
    if (typeof filter.enabled === 'boolean') where.enabled = filter.enabled;

    const files = await this.prisma.sysAgentMemoryFile.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    return files.map((f) => this.toView(f));
  }

  /** 顶部统计卡片：文件数 / 待确认数 / 最近更新 / 命中率 / 高风险数 */
  async stats(userId: number) {
    await this.ensureUserFiles(userId);
    const [fileCount, pendingCount, highRisk, latest, hitRate] = await Promise.all([
      this.prisma.sysAgentMemoryFile.count({ where: { userId } }),
      this.prisma.sysAgentMemoryPending.count({ where: { status: 'pending', userId } }),
      this.prisma.sysAgentMemoryFile.count({
        where: { userId, riskLevel: { in: HIGH_RISK_LEVELS as string[] } },
      }),
      this.prisma.sysAgentMemoryFile.findFirst({ where: { userId }, orderBy: { updateTime: 'desc' } }),
      // 命中率来自近 7 日读取日志（无数据返回「-」）
      this.readLogService.hitRate(),
    ]);
    return {
      fileCount,
      pendingCount,
      highRisk,
      hitRate,
      lastUpdate: latest ? this.relativeTime(latest.updateTime) : '-',
    };
  }

  /** 记录记忆读取埋点（供对话上下文注入记忆时调用；命中率数据来源） */
  async recordRead(items: { memoryKey?: string; memoryId?: number; hit?: boolean; sessionId?: string }[], userId?: number) {
    return this.readLogService.recordRead(items, userId);
  }

  /**
   * 构造可注入对话上下文的记忆文本：取所有 enabled+canRead 文件，按 sort 拼接内容。
   * 同时记录读取埋点（命中的文件 hit=true；无可用记忆记一条 hit=false），命中率数据来源。
   * 埋点失败不影响返回（recordRead 内部已 try/catch）。
   * @param userId 操作用户 ID
   * @param sessionId 对话会话标识
   * @returns 拼接好的记忆 Markdown 文本（无可用记忆时为空串）
   */
  async buildInjectableMemory(userId?: number, sessionId?: string): Promise<string> {
    // 匿名（无 userId）无个人记忆可注入：记一条未命中即返回
    if (!userId) {
      await this.readLogService.recordRead([{ hit: false, sessionId }], userId);
      return '';
    }
    await this.ensureUserFiles(userId);
    const files = await this.prisma.sysAgentMemoryFile.findMany({
      where: { userId, enabled: true, canRead: true },
      orderBy: { sort: 'asc' },
      select: { memoryKey: true, name: true, content: true },
    });
    if (files.length === 0) {
      // 无可用记忆：记一条未命中，供命中率分母统计
      await this.readLogService.recordRead([{ hit: false, sessionId }], userId);
      return '';
    }
    // 按 sort 优先拼接，受总长上限约束（与 pageContext/systemPrompt 的截断策略一致，
    // 防多文件全量拼接撑爆模型上下文/推高成本）；仅对实际注入的文件记 hit=true。
    const blocks: string[] = [];
    const injectedKeys: string[] = [];
    let used = 0;
    let truncated = false;
    for (const f of files) {
      const block = `## ${f.name}\n\n${f.content}`;
      const sep = blocks.length ? MEMORY_INJECT_SEP.length : 0;
      if (used + sep + block.length > MEMORY_INJECT_MAX_LEN) {
        truncated = true;
        break;
      }
      blocks.push(block);
      injectedKeys.push(f.memoryKey);
      used += sep + block.length;
    }
    if (truncated) {
      this.logger.warn(
        `注入记忆超长截断：注入 ${injectedKeys.length}/${files.length} 个文件（上限 ${MEMORY_INJECT_MAX_LEN} 字符）`,
      );
    }
    // 埋点：实际注入的文件记 hit=true（截断掉的不计命中）
    await this.readLogService.recordRead(
      injectedKeys.map((memoryKey) => ({ memoryKey, hit: true, sessionId })),
      userId,
    );
    return blocks.join(MEMORY_INJECT_SEP);
  }

  /** 单文件详情（当前用户的个人副本，含版本历史、模型建议） */
  async detail(memoryKey: string, userId: number) {
    await this.ensureUserFiles(userId);
    const file = await this.prisma.sysAgentMemoryFile.findFirst({
      where: { memoryKey, userId },
    });
    if (!file) return null;
    const [versions, suggestions] = await Promise.all([
      this.prisma.sysAgentMemoryVersion.findMany({
        where: { memoryId: file.id },
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysAgentMemorySuggestion.findMany({
        where: { memoryId: file.id, status: 'pending' },
        orderBy: { createTime: 'desc' },
      }),
    ]);
    return {
      ...this.toView(file),
      versions: versions.map((v) => ({
        version: v.version,
        time: this.fmtTime(v.createTime),
        updater: v.updater ?? '',
        note: v.note ?? '',
        current: v.version === file.version,
        content: v.content,
      })),
      suggestions: suggestions.map((s) => ({ id: `sg-${s.id}`, text: s.text })),
    };
  }

  /** 新建记忆文件（memoryKey 唯一、builtin=false、初始 v1.0.0） */
  async create(dto: {
    memoryKey: string;
    name?: string;
    description?: string;
    content?: string;
    category?: string;
    riskLevel?: string;
  }, creator?: string, userId?: number) {
    await this.ensureUserFiles(userId as number);
    // 同一用户下 memoryKey 唯一（个人副本互不影响其他用户的同名文件）
    const exists = await this.prisma.sysAgentMemoryFile.findFirst({
      where: { memoryKey: dto.memoryKey, userId },
    });
    if (exists) throw new BadRequestException(`记忆文件已存在: ${dto.memoryKey}`);
    // 个人文件：无安全拦截（每用户独立，写入仅影响自己）——直接创建
    const file = await this.prisma.sysAgentMemoryFile.create({
      data: {
        memoryKey: dto.memoryKey,
        userId,
        name: dto.name?.trim() || dto.memoryKey,
        description: dto.description ?? null,
        subtitle: `${dto.category === 'project' ? '项目记忆' : dto.category === 'custom' ? '自定义记忆' : '内部记忆'} · ${dto.name?.trim() || dto.memoryKey}`,
        content: dto.content ?? '',
        category: dto.category ?? 'internal',
        riskLevel: dto.riskLevel ?? 'L1',
        version: 'v1.0.0',
        builtin: false,
        creator: creator ?? null,
        updater: creator ?? null,
      },
    });
    await this.versionService.writeSnapshot(file, 'create', '初始创建', creator);
    return this.toView(file);
  }

  /** 保存记忆文件内容（个人文件，无拦截直写；version 自增，更新 updater/updateTime） */
  async saveContent(memoryKey: string, content: string, updater?: string, userId?: number) {
    const file = await this.requireFile(memoryKey, userId as number);
    // 个人文件：无安全拦截（每用户独立，写入仅影响自己）——直接写入
    const updated = await this.prisma.sysAgentMemoryFile.update({
      where: { id: file.id },
      data: { content, version: bumpVersion(file.version), updater: updater ?? file.updater },
    });
    await this.versionService.writeSnapshot(updated, 'update', '编辑内容', updater);
    return this.toView(updated);
  }

  /** 记忆写入前安全裁决（供前端 /check 预判，不写库） */
  async checkWrite(memoryKey: string, text: string, userId?: number) {
    return this.securityService.checkWrite(memoryKey, text, userId);
  }

  /** 更新权限配置（局部 patch，enabled 与文件启用同步） */
  async updatePermission(memoryKey: string, patch: Record<string, boolean | undefined>, updater?: string, userId?: number) {
    const file = await this.requireFile(memoryKey, userId as number);
    const data: Record<string, boolean | string> = {};
    for (const key of ['enabled', 'canRead', 'canSuggest', 'canAutoWrite', 'needConfirm', 'auditLog']) {
      if (typeof patch[key] === 'boolean') data[key] = patch[key] as boolean;
    }
    if (Object.keys(data).length === 0) return this.toView(file);
    if (updater) data.updater = updater;
    const updated = await this.prisma.sysAgentMemoryFile.update({ where: { id: file.id }, data });
    return this.toView(updated);
  }

  /** 启用/停用（enabled 即 permission.enabled） */
  async toggle(memoryKey: string, enabled: boolean, updater?: string, userId?: number) {
    const file = await this.requireFile(memoryKey, userId as number);
    const updated = await this.prisma.sysAgentMemoryFile.update({
      where: { id: file.id },
      data: { enabled, updater: updater ?? file.updater },
    });
    return this.toView(updated);
  }

  /** 删除记忆文件（内置拒绝；version/suggestion/readLog 由 relation Cascade 清理；清理他文件对它的关联引用） */
  async remove(memoryKey: string, userId: number) {
    const file = await this.requireFile(memoryKey, userId);
    if (file.builtin) throw new BadRequestException('内置记忆文件不可删除');
    await this.prisma.sysAgentMemoryFile.delete({ where: { id: file.id } });
    await this.cleanupRelatedRefs(memoryKey, userId);
    return { memoryKey };
  }

  /** 从当前用户其他文件的 relatedIds 中移除对已删除文件的引用（仅限本人副本） */
  private async cleanupRelatedRefs(removedKey: string, userId: number): Promise<void> {
    const others = await this.prisma.sysAgentMemoryFile.findMany({ where: { userId } });
    for (const f of others) {
      const rel = Array.isArray(f.relatedIds) ? (f.relatedIds as string[]) : [];
      if (rel.includes(removedKey)) {
        await this.prisma.sysAgentMemoryFile.update({
          where: { id: f.id },
          data: { relatedIds: rel.filter((k) => k !== removedKey) },
        });
      }
    }
  }

  /** 按 (memoryKey, userId) 取当前用户的文件副本，不存在则抛 400 */
  private async requireFile(memoryKey: string, userId: number) {
    const file = await this.prisma.sysAgentMemoryFile.findFirst({ where: { memoryKey, userId } });
    if (!file) throw new BadRequestException(`记忆文件不存在: ${memoryKey}`);
    return file;
  }

  /** 格式化为 yyyy-MM-dd HH:mm */
  private fmtTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** 生成相对时间文本（如"12分钟前""2小时前"） */
  private relativeTime(d: Date): string {
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min}分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}小时前`;
    const day = Math.floor(hour / 24);
    if (day === 1) return `昨天 ${this.fmtTime(d).slice(11)}`;
    return `${day}天前`;
  }
}
