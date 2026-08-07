import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { RUN_LOG_ID_PREFIX } from '../catalog/agent-run-log.enums';

/** 归一化后的统一运行日志（对齐前端 AgentRunLog） */
export interface UnifiedRunLog {
  id: string;
  sessionId: string;
  requestId: string;
  agentName: string;
  type: string;
  status: string;
  summary: string;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  user?: string;
  sourcePage?: string;
  skillName?: string;
  toolName?: string;
  riskLevel?: string;
  processed?: boolean;
  detail: Record<string, any>;
}

/** 列表过滤条件（服务内部） */
export interface RunLogFilter {
  type?: string;
  status?: string;
  agent?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** 单源抓取上限，防跨源合并时内存膨胀 */
const SOURCE_FETCH_CAP = 2000;

/** 格式化时间为 'YYYY-MM-DD HH:mm:ss'（对齐前端展示口径） */
function fmt(d: Date | null | undefined): string {
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 运行日志查询服务（方案C混合聚合）
 *
 * 将 4 个来源归一化为统一 UnifiedRunLog：
 *   - sys_agent_run_log（本表，conversation/system/error）
 *   - sys_agent_skill_run_log → type=skill
 *   - sys_agent_tool_call_log → type=tool
 *   - sys_agent_memory_read_log → type=memory
 * 服务端过滤 + 跨源合并 + 统一分页；id 加来源前缀便于详情回查。
 */
@Injectable()
export class RunLogQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /** 状态过滤能否命中 skill/tool/memory（这三源只有 success/failed 两态） */
  private statusAllowsSuccessSources(status?: string): boolean {
    return !status || status === 'success' || status === 'failed';
  }

  /** 日期范围转 Prisma createTime 条件 */
  private dateWhere(dateFrom?: string, dateTo?: string): Record<string, any> | undefined {
    if (!dateFrom && !dateTo) return undefined;
    const cond: Record<string, any> = {};
    if (dateFrom) cond.gte = new Date(`${dateFrom} 00:00:00`);
    if (dateTo) cond.lte = new Date(`${dateTo} 23:59:59`);
    return cond;
  }

  /** 抓取本表（conversation/system/error）并归一化 */
  private async fetchOwn(f: RunLogFilter): Promise<UnifiedRunLog[]> {
    // type 指定了非本表类型则跳过
    if (f.type && !['conversation', 'system', 'error'].includes(f.type)) return [];
    const where: Record<string, any> = {};
    if (f.type) where.type = f.type;
    if (f.status) where.status = f.status;
    if (f.agent) where.agentName = f.agent;
    const dw = this.dateWhere(f.dateFrom, f.dateTo);
    if (dw) where.startedAt = dw;
    if (f.keyword) {
      where.OR = [
        { summary: { contains: f.keyword } },
        { sessionId: { contains: f.keyword } },
        { agentName: { contains: f.keyword } },
      ];
    }
    const rows = await this.prisma.sysAgentRunLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: SOURCE_FETCH_CAP,
    });
    const userMap = await this.resolveUsers(rows.map((r) => r.userId));
    return rows.map((r) => this.normalizeOwn(r, r.userName ?? userMap.get(r.userId ?? -1)));
  }

  /** 归一化本表行（conversation/system/error） */
  private normalizeOwn(r: any, userName?: string): UnifiedRunLog {
    return {
      id: `${RUN_LOG_ID_PREFIX.own}${r.id}`,
      sessionId: r.sessionId ?? '',
      requestId: r.requestId ?? '',
      agentName: r.agentName ?? '',
      type: r.type,
      status: r.status,
      summary: r.summary,
      startedAt: fmt(r.startedAt),
      endedAt: r.endedAt ? fmt(r.endedAt) : undefined,
      durationMs: r.durationMs,
      user: userName,
      sourcePage: r.sourcePage ?? undefined,
      riskLevel: r.riskLevel ?? undefined,
      processed: r.processed,
      detail: (r.detail as Record<string, any>) ?? {},
    };
  }

  /** 批量解析用户 ID→用户名，避免 N+1 */
  private async resolveUsers(ids: (number | null)[]): Promise<Map<number, string>> {
    const uniq = [...new Set(ids.filter((x): x is number => typeof x === 'number'))];
    const map = new Map<number, string>();
    if (uniq.length === 0) return map;
    const users = await this.prisma.sysUser.findMany({
      where: { id: { in: uniq } },
      select: { id: true, username: true },
    });
    for (const u of users) map.set(u.id, u.username);
    return map;
  }

  /** 抓取技能运行日志并归一化为 type=skill */
  private async fetchSkill(f: RunLogFilter): Promise<UnifiedRunLog[]> {
    if (f.type && f.type !== 'skill') return [];
    if (!this.statusAllowsSuccessSources(f.status)) return [];
    if (f.agent) return []; // 技能日志无 agent 维度，指定 agent 时不命中
    const where: Record<string, any> = {};
    if (f.status) where.success = f.status === 'success';
    const dw = this.dateWhere(f.dateFrom, f.dateTo);
    if (dw) where.createTime = dw;
    if (f.keyword) {
      where.OR = [
        { capabilityKey: { contains: f.keyword } },
        { errorMsg: { contains: f.keyword } },
        { skill: { name: { contains: f.keyword } } },
      ];
    }
    const rows = await this.prisma.sysAgentSkillRunLog.findMany({
      where,
      orderBy: { createTime: 'desc' },
      take: SOURCE_FETCH_CAP,
      include: { skill: { select: { name: true, riskLevel: true } } },
    });
    const userMap = await this.resolveUsers(rows.map((r) => r.userId));
    return rows.map((r) => this.normalizeSkill(r, userMap.get(r.userId ?? -1)));
  }

  /** 归一化技能运行日志行 */
  private normalizeSkill(r: any, userName?: string): UnifiedRunLog {
    return {
      id: `${RUN_LOG_ID_PREFIX.skill}${r.id}`,
      sessionId: '',
      requestId: '',
      agentName: '',
      type: 'skill',
      status: r.success ? 'success' : 'failed',
      summary: `${r.skill?.name ?? '技能'} · ${r.capabilityKey}`,
      startedAt: fmt(r.createTime),
      endedAt: fmt(r.createTime),
      durationMs: r.durationMs,
      user: userName,
      skillName: r.skill?.name ?? undefined,
      riskLevel: r.skill?.riskLevel ?? undefined,
      detail: { capabilityKey: r.capabilityKey, errorMsg: r.errorMsg ?? undefined },
    };
  }

  /** 抓取工具调用日志并归一化为 type=tool */
  private async fetchTool(f: RunLogFilter): Promise<UnifiedRunLog[]> {
    if (f.type && f.type !== 'tool') return [];
    if (!this.statusAllowsSuccessSources(f.status)) return [];
    const where: Record<string, any> = {};
    if (f.status) where.success = f.status === 'success';
    if (f.agent) where.agent = f.agent;
    const dw = this.dateWhere(f.dateFrom, f.dateTo);
    if (dw) where.createTime = dw;
    if (f.keyword) {
      where.OR = [
        { toolKey: { contains: f.keyword } },
        { agent: { contains: f.keyword } },
        { skill: { contains: f.keyword } },
        { tool: { name: { contains: f.keyword } } },
      ];
    }
    const rows = await this.prisma.sysAgentToolCallLog.findMany({
      where,
      orderBy: { createTime: 'desc' },
      take: SOURCE_FETCH_CAP,
      include: { tool: { select: { name: true, riskLevel: true } } },
    });
    const userMap = await this.resolveUsers(rows.map((r) => r.operatorId));
    return rows.map((r) => this.normalizeTool(r, userMap.get(r.operatorId ?? -1)));
  }

  /** 归一化工具调用日志行 */
  private normalizeTool(r: any, userName?: string): UnifiedRunLog {
    return {
      id: `${RUN_LOG_ID_PREFIX.tool}${r.id}`,
      sessionId: '',
      requestId: '',
      agentName: r.agent ?? '',
      type: 'tool',
      status: r.success ? 'success' : 'failed',
      summary: `${r.tool?.name ?? '工具'} · ${r.toolKey}`,
      startedAt: fmt(r.createTime),
      endedAt: fmt(r.createTime),
      durationMs: r.durationMs,
      user: userName,
      toolName: r.tool?.name ?? undefined,
      skillName: r.skill ?? undefined,
      riskLevel: r.tool?.riskLevel ?? undefined,
      detail: { toolKey: r.toolKey, params: r.params ?? undefined, skill: r.skill ?? undefined },
    };
  }

  /** 抓取记忆读取日志并归一化为 type=memory（hit→success/failed 命中口径） */
  private async fetchMemory(f: RunLogFilter): Promise<UnifiedRunLog[]> {
    if (f.type && f.type !== 'memory') return [];
    if (!this.statusAllowsSuccessSources(f.status)) return [];
    if (f.agent) return []; // 记忆读取无 agent 维度
    const where: Record<string, any> = {};
    if (f.status) where.hit = f.status === 'success';
    const dw = this.dateWhere(f.dateFrom, f.dateTo);
    if (dw) where.createTime = dw;
    if (f.keyword) {
      where.OR = [
        { memoryKey: { contains: f.keyword } },
        { sessionId: { contains: f.keyword } },
      ];
    }
    const rows = await this.prisma.sysAgentMemoryReadLog.findMany({
      where,
      orderBy: { createTime: 'desc' },
      take: SOURCE_FETCH_CAP,
    });
    const userMap = await this.resolveUsers(rows.map((r) => r.userId));
    return rows.map((r) => this.normalizeMemory(r, userMap.get(r.userId ?? -1)));
  }

  /** 归一化记忆读取日志行 */
  private normalizeMemory(r: any, userName?: string): UnifiedRunLog {
    return {
      id: `${RUN_LOG_ID_PREFIX.memory}${r.id}`,
      sessionId: r.sessionId ?? '',
      requestId: '',
      agentName: '',
      type: 'memory',
      status: r.hit ? 'success' : 'failed',
      summary: r.hit ? `命中记忆 · ${r.memoryKey ?? '未知'}` : '未命中记忆',
      startedAt: fmt(r.createTime),
      endedAt: fmt(r.createTime),
      durationMs: 0,
      user: userName,
      detail: { memoryKey: r.memoryKey ?? undefined, hit: r.hit },
    };
  }

  /** 聚合 4 源（按 type 过滤下推：命中单源时只查该源） */
  private async aggregate(f: RunLogFilter): Promise<UnifiedRunLog[]> {
    const [own, skill, tool, memory] = await Promise.all([
      this.fetchOwn(f),
      this.fetchSkill(f),
      this.fetchTool(f),
      this.fetchMemory(f),
    ]);
    const all = [...own, ...skill, ...tool, ...memory];
    // 关键词兜底：命中 id（如 "skill-3"）——各源 SQL 无法匹配前缀 id，此处再过滤一次
    const kw = f.keyword?.trim().toLowerCase();
    const filtered = kw
      ? all.filter(
          (l) =>
            l.id.toLowerCase().includes(kw) ||
            [l.summary, l.skillName, l.toolName, l.sessionId, l.agentName]
              .filter(Boolean)
              .some((s) => s!.toLowerCase().includes(kw)),
        )
      : all;
    // 按开始时间倒序
    filtered.sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0));
    return filtered;
  }

  /** 分页列表：聚合后统一分页 */
  async list(f: RunLogFilter, page: number, pageSize: number) {
    const all = await this.aggregate(f);
    const total = all.length;
    const start = (page - 1) * pageSize;
    const list = all.slice(start, start + pageSize);
    return { list, total, page, pageSize };
  }

  /** 分类计数：6 类各自命中数（基于当前非分类过滤条件） */
  async categoryCount(f: RunLogFilter) {
    // 分类计数忽略 type 过滤本身，保留其他过滤条件
    const base: RunLogFilter = { ...f, type: undefined };
    const all = await this.aggregate(base);
    const counts: Record<string, number> = {
      conversation: 0,
      skill: 0,
      tool: 0,
      error: 0,
      memory: 0,
      system: 0,
    };
    for (const l of all) if (l.type in counts) counts[l.type]++;
    return Object.keys(counts).map((key) => ({ key, count: counts[key] }));
  }

  /** 导出：复用聚合，不分页（上限 SOURCE_FETCH_CAP*源数） */
  async export(f: RunLogFilter) {
    return this.aggregate(f);
  }

  /** 单条解析用户名（供 detail 按主键直查复用） */
  private async resolveUser(id: number | null): Promise<string | undefined> {
    if (typeof id !== 'number') return undefined;
    const u = await this.prisma.sysUser.findUnique({
      where: { id },
      select: { username: true },
    });
    return u?.username;
  }

  /** 详情：按带前缀 id 直查主键回对应源表（不再全量拉取后 find） */
  async detail(prefixedId: string): Promise<UnifiedRunLog | null> {
    const dash = prefixedId.indexOf('-');
    if (dash < 0) return null;
    const prefix = prefixedId.slice(0, dash + 1);
    const rawId = Number(prefixedId.slice(dash + 1));
    if (!Number.isInteger(rawId)) return null;
    switch (prefix) {
      case RUN_LOG_ID_PREFIX.own: {
        const r = await this.prisma.sysAgentRunLog.findUnique({ where: { id: rawId } });
        if (!r) return null;
        return this.normalizeOwn(r, r.userName ?? (await this.resolveUser(r.userId)));
      }
      case RUN_LOG_ID_PREFIX.skill: {
        const r = await this.prisma.sysAgentSkillRunLog.findUnique({
          where: { id: rawId },
          include: { skill: { select: { name: true, riskLevel: true } } },
        });
        if (!r) return null;
        return this.normalizeSkill(r, await this.resolveUser(r.userId));
      }
      case RUN_LOG_ID_PREFIX.tool: {
        const r = await this.prisma.sysAgentToolCallLog.findUnique({
          where: { id: rawId },
          include: { tool: { select: { name: true, riskLevel: true } } },
        });
        if (!r) return null;
        return this.normalizeTool(r, await this.resolveUser(r.operatorId));
      }
      case RUN_LOG_ID_PREFIX.memory: {
        const r = await this.prisma.sysAgentMemoryReadLog.findUnique({ where: { id: rawId } });
        if (!r) return null;
        return this.normalizeMemory(r, await this.resolveUser(r.userId));
      }
      default:
        return null;
    }
  }
}
