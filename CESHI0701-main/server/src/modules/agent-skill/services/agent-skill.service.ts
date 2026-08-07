import { Injectable, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';
import { SkillVersionService, bumpVersion } from './skill-version.service';
import {
  AGENT_CAPABILITY_CATALOG,
  AgentCapability,
  resolveCapability,
  findUnknownCapabilities,
} from '../catalog/agent-capability.catalog';
import {
  HIGH_RISK_LEVELS,
  SKILL_CATEGORY_VALUES,
  SKILL_CATEGORY_LABELS,
  SKILL_RISK_VALUES,
  SKILL_RISK_NOTES,
  SKILL_APPLICABLE_AGENTS,
} from '../catalog/agent-skill.enums';

/** 技能列表筛选条件 */
export interface SkillListFilter {
  keyword?: string;
  category?: string;
  riskLevel?: string;
  status?: number;
  applicableAgent?: string;
  page?: number;
  pageSize?: number;
}

/** 技能新建/更新可选扩展字段 */
export interface SkillExtraFields {
  category?: string;
  riskLevel?: string;
  cliCommand?: string;
  triggerKeywords?: string[];
  applicableAgents?: string[];
}

/** 解析后的工具定义（返回给前端注册为智能体工具） */
export interface ResolvedTool {
  /** 工具名（LLM function name） */
  name: string;
  /** 归属技能键（前端执行前安全策略校验用，定位技能风险等级） */
  skillKey: string;
  /** 能力 key（capability key，前端埋点运行日志时回传，供后端归属技能） */
  capabilityKey: string;
  /** 工具描述 */
  description: string;
  /** 参数 JSON Schema */
  parameters: Record<string, unknown>;
  /** 调用绑定：由后端权威给出，前端通用执行器据此发请求 */
  http: { method: 'GET' | 'POST'; path: string };
  /** 调用该工具所需的权限点（前端据此做纵深防御的二次过滤；为空表示仅需登录） */
  requiredPerms?: string;
  /** 是否敏感（写盘/改数据），前端可据此加确认 */
  sensitive?: boolean;
}

/** 内置技能种子键 */
const BUILTIN_SKILL_KEY = 'backend-codegen';

/**
 * 智能体技能服务
 *
 * 管理 SysAgentSkill 的 CRUD，并把技能引用的能力目录解析为前端可注册的工具定义。
 * 启动时幂等写入一条内置"后端代码生成"技能（默认仅含只读/预览能力，不含落盘生成）。
 */
@Injectable()
export class AgentSkillService extends BaseService implements OnModuleInit {
  private readonly logger = new Logger(AgentSkillService.name);

  constructor(
    protected prisma: PrismaService,
    private readonly versionService: SkillVersionService,
  ) {
    super(prisma, 'sysAgentSkill');
  }

  /** 启动时幂等初始化内置技能（存在则跳过，不覆盖用户后续修改） */
  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.prisma.sysAgentSkill.findUnique({
        where: { skillKey: BUILTIN_SKILL_KEY },
      });
      if (exists) return;
      await this.prisma.sysAgentSkill.create({
        data: {
          skillKey: BUILTIN_SKILL_KEY,
          name: '后端代码生成',
          description: '让智能体查询数据库表、读取表结构、预览生成的后端模块代码（只读，不落盘）',
          // 默认仅只读三件套，不含 codegen.generateModule（落盘写文件）
          capabilities: ['codegen.listTables', 'codegen.introspect', 'codegen.preview'],
          enabled: true,
          builtin: true,
          sort: 0,
        },
      });
      this.logger.log('已初始化内置技能: 后端代码生成');
    } catch (e) {
      // 初始化失败不应阻断应用启动，记录待排查
      this.logger.error(`内置技能初始化失败: ${(e as Error).message}`);
    }
  }

  /** 返回完整能力目录（管理 UI 新建技能时供勾选） */
  listCatalog(): AgentCapability[] {
    return AGENT_CAPABILITY_CATALOG;
  }

  /**
   * 下发分类/风险等级枚举（供前端替代写死常量，消除双维护漂移）。
   * 风险等级附带说明文案（含 L4），前端权限控制页签直接展示。
   */
  listEnums() {
    return {
      categories: SKILL_CATEGORY_VALUES.map((key) => ({
        key,
        label: SKILL_CATEGORY_LABELS[key] ?? key,
      })),
      riskLevels: SKILL_RISK_VALUES.map((key) => ({
        key,
        label: key,
        note: SKILL_RISK_NOTES[key] ?? '',
      })),
      // 可选适用智能体清单（前端下拉，替代自由文本，避免引用无效智能体）
      agents: [...SKILL_APPLICABLE_AGENTS],
    };
  }

  /**
   * 校验能力 key 列表合法（全部已在目录登记），非法则抛错
   * @param keys 能力 key 列表
   */
  private assertValidCapabilities(keys: string[]): void {
    const unknown = findUnknownCapabilities(keys);
    if (unknown.length) {
      throw new BadRequestException(`包含未登记的能力: ${unknown.join(', ')}`);
    }
  }

  /**
   * 新建技能
   * @param data 技能数据（skillKey/name/description/capabilities/enabled/sort）
   */
  async createSkill(
    data: {
      skillKey: string;
      name: string;
      description?: string;
      capabilities: string[];
      enabled?: boolean;
      sort?: number;
    } & SkillExtraFields,
    creator?: string,
  ): Promise<{ id: number }> {
    this.assertValidCapabilities(data.capabilities);
    const dup = await this.prisma.sysAgentSkill.findUnique({ where: { skillKey: data.skillKey } });
    if (dup) {
      throw new BadRequestException(`技能键已存在: ${data.skillKey}`);
    }
    const created = await this.prisma.sysAgentSkill.create({
      data: {
        skillKey: data.skillKey,
        name: data.name,
        description: data.description ?? null,
        capabilities: data.capabilities,
        category: data.category ?? 'operation',
        riskLevel: data.riskLevel ?? 'L1',
        version: 'v1.0.0',
        cliCommand: data.cliCommand ?? null,
        triggerKeywords: data.triggerKeywords ?? [],
        applicableAgents: data.applicableAgents ?? [],
        creator: creator ?? null,
        enabled: data.enabled ?? true,
        builtin: false,
        sort: data.sort ?? 0,
      },
    });
    // 记初始版本快照（create）
    await this.versionService.writeSnapshot(created, 'create', '创建技能', creator);
    return { id: created.id };
  }

  /**
   * 更新技能（不允许改 skillKey / builtin）
   * @param id 主键
   * @param data 待更新字段
   */
  async updateSkill(
    id: number,
    data: { name?: string; description?: string; capabilities?: string[]; sort?: number } & SkillExtraFields,
    operator?: string,
  ): Promise<void> {
    if (data.capabilities) {
      this.assertValidCapabilities(data.capabilities);
    }
    const existing = await this.ensureExists(id);
    const updated = await this.prisma.sysAgentSkill.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.capabilities !== undefined && { capabilities: data.capabilities }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.riskLevel !== undefined && { riskLevel: data.riskLevel }),
        ...(data.cliCommand !== undefined && { cliCommand: data.cliCommand }),
        ...(data.triggerKeywords !== undefined && { triggerKeywords: data.triggerKeywords }),
        ...(data.applicableAgents !== undefined && { applicableAgents: data.applicableAgents }),
        ...(data.sort !== undefined && { sort: data.sort }),
        // 每次更新自动递增修订号（vX.Y.Z → vX.Y.(Z+1)），供"查看版本"展示演进
        version: bumpVersion(existing.version),
      },
    });
    // 记 update 版本快照（摘要列出变更字段）
    const changed = Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== undefined);
    await this.versionService.writeSnapshot(
      updated,
      'update',
      changed.length ? `更新字段：${changed.join('、')}` : '更新技能',
      operator,
    );
  }

  /**
   * 切换启用状态
   * @param id 主键
   * @param enabled 目标状态
   */
  async toggle(id: number, enabled: boolean): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.sysAgentSkill.update({ where: { id }, data: { enabled } });
  }

  /**
   * 删除技能（内置技能禁止删除）
   * @param id 主键
   */
  async remove(id: number): Promise<void> {
    const skill = await this.ensureExists(id);
    if (skill.builtin) {
      throw new BadRequestException('内置技能不可删除，可将其停用');
    }
    await this.prisma.sysAgentSkill.delete({ where: { id } });
  }

  /**
   * 汇总所有已启用技能的解析后工具，供前端注册给智能体
   * 工具的 http 绑定来自后端目录（vetted），非技能表存储，杜绝任意 URL 注入。
   * @returns 去重后的工具定义列表
   */
  async resolveEnabledTools(): Promise<ResolvedTool[]> {
    const skills = await this.prisma.sysAgentSkill.findMany({
      where: { enabled: true },
      orderBy: { sort: 'asc' },
    });
    // 复用 SKILL_RISK_VALUES 作为风险高低序（单一事实源，避免与枚举漂移）
    const rank = (lvl: string) => (SKILL_RISK_VALUES as readonly string[]).indexOf(lvl);
    const tools = new Map<string, { tool: ResolvedTool; risk: string }>();
    for (const skill of skills) {
      const keys = Array.isArray(skill.capabilities) ? (skill.capabilities as string[]) : [];
      for (const key of keys) {
        const cap = resolveCapability(key);
        // 技能可能引用了已下线的能力，跳过而非报错
        if (!cap) continue;
        // 同一能力被多个技能引用时，保留风险等级更高的技能归属：
        // skillKey 现驱动执行前安全策略判定，先到先得会把高风险技能静默降级。
        const prev = tools.get(cap.toolName);
        if (prev && rank(skill.riskLevel) <= rank(prev.risk)) continue;
        tools.set(cap.toolName, {
          risk: skill.riskLevel,
          tool: {
            name: cap.toolName,
            skillKey: skill.skillKey,
            capabilityKey: cap.key,
            description: cap.description,
            parameters: cap.parameters,
            http: { method: cap.method, path: cap.path },
            requiredPerms: cap.requiredPerms,
            sensitive: cap.sensitive,
          },
        });
      }
    }
    return [...tools.values()].map((e) => e.tool);
  }

  /**
   * 某能力在一组技能中的归属技能：取引用它且风险等级最高者（并列取入参顺序靠前者）。
   * 统一 resolveEnabledTools 与 recordRun 的归属口径，使执行时安全判定与运行日志/审计挂靠同一技能。
   * @param skills 候选技能列表（调用方按 sort asc 预排序，决定并列时的优先）
   * @param capabilityKey 能力 key
   * @returns 归属技能，无则 undefined
   */
  private pickHighestRiskOwner<T extends { capabilities: unknown; riskLevel: string }>(
    skills: T[],
    capabilityKey: string,
  ): T | undefined {
    const rank = (lvl: string) => (SKILL_RISK_VALUES as readonly string[]).indexOf(lvl);
    let owner: T | undefined;
    for (const s of skills) {
      const keys = Array.isArray(s.capabilities) ? (s.capabilities as string[]) : [];
      if (!keys.includes(capabilityKey)) continue;
      if (!owner || rank(s.riskLevel) > rank(owner.riskLevel)) owner = s;
    }
    return owner;
  }

  /**
   * 分页 + 筛选查询技能列表（管理台用）。
   * 附带每个技能的最近运行时间与近7日调用数（来自运行日志聚合）。
   * @param filter 筛选与分页条件
   */
  async listWithFilter(filter: SkillListFilter) {
    const page = Math.max(filter.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filter.pageSize ?? 10, 1), 100);
    const where: Record<string, unknown> = {};
    if (filter.keyword) {
      where.OR = [
        { name: { contains: filter.keyword } },
        { description: { contains: filter.keyword } },
      ];
    }
    if (filter.category) where.category = filter.category;
    if (filter.riskLevel) where.riskLevel = filter.riskLevel;
    if (filter.status === 0 || filter.status === 1) where.enabled = filter.status === 1;
    // 适用智能体：JSON 数组包含匹配（MySQL JSON_CONTAINS，Prisma array_contains）
    if (filter.applicableAgent) {
      where.applicableAgents = { array_contains: filter.applicableAgent };
    }

    const [list, total] = await Promise.all([
      this.prisma.sysAgentSkill.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sort: 'asc' },
      }),
      this.prisma.sysAgentSkill.count({ where }),
    ]);

    // 附加运行统计（最近运行时间 + 近7日调用数）
    const enriched = await this.attachRunStats(list);
    return { list: enriched, pagination: { page, pageSize, total } };
  }

  /**
   * 为技能列表附加运行统计：最近一次运行时间、近7日调用次数。
   * @param skills 技能记录列表
   */
  private async attachRunStats<T extends { id: number }>(skills: T[]) {
    if (!skills.length) return skills.map((s) => ({ ...s, lastRunAt: null, calls7d: 0 }));
    const ids = skills.map((s) => s.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // 近7日按技能分组计数
    const grouped = await this.prisma.sysAgentSkillRunLog.groupBy({
      by: ['skillId'],
      where: { skillId: { in: ids }, createTime: { gte: sevenDaysAgo } },
      _count: { _all: true },
    });
    const callsMap = new Map(grouped.map((g) => [g.skillId, g._count._all]));
    // 每个技能最近一次运行时间
    const lastRuns = await this.prisma.sysAgentSkillRunLog.groupBy({
      by: ['skillId'],
      where: { skillId: { in: ids } },
      _max: { createTime: true },
    });
    const lastRunMap = new Map(lastRuns.map((g) => [g.skillId, g._max.createTime]));
    return skills.map((s) => ({
      ...s,
      lastRunAt: lastRunMap.get(s.id) ?? null,
      calls7d: callsMap.get(s.id) ?? 0,
    }));
  }

  /**
   * 顶部统计卡片：全部/已启用/高风险/近7日调用/失效率。
   */
  async stats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, enabled, highRisk, calls7d, failed7d] = await Promise.all([
      this.prisma.sysAgentSkill.count(),
      this.prisma.sysAgentSkill.count({ where: { enabled: true } }),
      this.prisma.sysAgentSkill.count({ where: { riskLevel: { in: HIGH_RISK_LEVELS as string[] } } }),
      this.prisma.sysAgentSkillRunLog.count({ where: { createTime: { gte: sevenDaysAgo } } }),
      this.prisma.sysAgentSkillRunLog.count({
        where: { createTime: { gte: sevenDaysAgo }, success: false },
      }),
    ]);
    // 失效率：近7日失败数 / 近7日总调用数（无调用则 0），保留 1 位小数百分比
    const failRate = calls7d > 0 ? Math.round((failed7d / calls7d) * 1000) / 10 : 0;
    return { total, enabled, highRisk, calls7d, failRate };
  }

  /**
   * 左侧分类计数：每个类型的技能数量 + 全部总数。
   */
  async categoryCounts() {
    const grouped = await this.prisma.sysAgentSkill.groupBy({
      by: ['category'],
      _count: { _all: true },
    });
    const map = new Map(grouped.map((g) => [g.category, g._count._all]));
    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
    const categories = SKILL_CATEGORY_VALUES.map((key) => ({ key, count: map.get(key) ?? 0 }));
    return { total, categories };
  }

  /**
   * 记录一次技能运行日志（聊天前端埋点写入）。
   * 按 capabilityKey 反查所属技能（能力被哪个启用技能引用），找不到则跳过（不报错）。
   * @param data 运行结果
   * @param userId 调用用户 ID
   */
  async recordRun(
    data: { capabilityKey: string; success: boolean; durationMs?: number; errorMsg?: string },
    userId?: number,
  ): Promise<void> {
    // 能力可能被多个启用技能引用。归属口径必须与 resolveEnabledTools 一致：取风险等级最高者，
    // 使运行日志/审计归属与执行时安全策略判定挂靠的技能是同一个（避免审计追溯链错位）。
    const skills = await this.prisma.sysAgentSkill.findMany({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    const owner = this.pickHighestRiskOwner(skills, data.capabilityKey);
    if (!owner) return; // 无归属技能，不记录
    await this.prisma.sysAgentSkillRunLog.create({
      data: {
        skillId: owner.id,
        capabilityKey: data.capabilityKey,
        success: data.success,
        durationMs: data.durationMs ?? 0,
        errorMsg: data.errorMsg ? data.errorMsg.slice(0, 500) : null,
        userId: userId ?? null,
      },
    });
  }

  /**
   * 某技能的运行日志分页列表。
   * @param skillId 技能 ID
   * @param page 页码
   * @param pageSize 每页条数
   */
  async runLogList(skillId: number, page = 1, pageSize = 10, success?: boolean) {
    const p = Math.max(page, 1);
    const ps = Math.min(Math.max(pageSize, 1), 100);
    // success 可选：true 只看成功、false 只看失败、undefined 全部
    const where: Record<string, unknown> = { skillId };
    if (success === true || success === false) where.success = success;
    const [list, total] = await Promise.all([
      this.prisma.sysAgentSkillRunLog.findMany({
        where,
        skip: (p - 1) * ps,
        take: ps,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysAgentSkillRunLog.count({ where }),
    ]);
    return { list, pagination: { page: p, pageSize: ps, total } };
  }

  /** 按主键取技能，不存在抛错 */
  private async ensureExists(id: number) {
    const skill = await this.prisma.sysAgentSkill.findUnique({ where: { id } });
    if (!skill) {
      throw new BadRequestException(`技能不存在: ${id}`);
    }
    return skill;
  }
}
