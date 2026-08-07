import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { SecurityCheckService } from '@/modules/security-policy/services/security-check.service';
import { TOOL_TYPES, TOOL_HIGH_RISK_LEVELS } from '../catalog/agent-tool.enums';

/** 工具列表筛选条件 */
export interface ToolListFilter {
  keyword?: string;
  type?: string;
  riskLevel?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}

/** 工具动作 → 安全校验 actionType 映射（工具 type 决定校验维度） */
const TOOL_TYPE_TO_ACTION: Record<string, string> = {
  cli: 'cli',
  api: 'api',
  database: 'database',
  filesystem: 'file',
  page: 'page',
  browser: 'page',
  external: 'api',
};

/**
 * 智能体工具服务
 *
 * 管理 SysAgentTool 的 CRUD、统计、分类计数与调用日志。
 * checkToolPermission 委托 SecurityCheckService，使工具校验与安全策略统一（风险等级/黑白名单/敏感词/审批）。
 * 启动时幂等 seed 7 条示例工具（对齐前端 mockAgentTools）。
 */
@Injectable()
export class AgentToolService {
  private readonly logger = new Logger(AgentToolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityCheck: SecurityCheckService,
  ) {}

  // onModuleInit 的 mock 种子已移除：工具清单改由前端注册表同步（syncRegistry）填充真实工具，
  // 避免 7 条示例工具与实际可调用工具混淆。旧库残留的示例工具由 seedTools 不再触发，
  // 需要清理时可在工具页手动删除。seedTools 保留仅作历史参考，不再被调用。

  /** 工具列表（筛选 + 分页） */
  async listWithFilter(filter: ToolListFilter) {
    const page = Math.max(filter.page ?? 1, 1);
    const pageSize = Math.min(Math.max(filter.pageSize ?? 10, 1), 100);
    const where: Record<string, unknown> = {};
    if (filter.keyword) {
      where.OR = [{ name: { contains: filter.keyword } }, { description: { contains: filter.keyword } }];
    }
    if (filter.type) where.type = filter.type;
    if (filter.riskLevel) where.riskLevel = filter.riskLevel;
    if (filter.status === 0 || filter.status === 1) where.enabled = filter.status === 1;
    const [list, total] = await Promise.all([
      this.prisma.sysAgentTool.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sort: 'asc' },
      }),
      this.prisma.sysAgentTool.count({ where }),
    ]);
    return { list, pagination: { page, pageSize, total } };
  }

  /** 新建工具 */
  async createTool(data: {
    toolKey: string;
    name: string;
    type: string;
    description?: string;
    riskLevel?: string;
    enabled?: boolean;
    requireConfirm?: boolean;
    applicableAgents?: string[];
    config?: Record<string, unknown>;
    sort?: number;
  }): Promise<{ id: number }> {
    const dup = await this.prisma.sysAgentTool.findUnique({ where: { toolKey: data.toolKey } });
    if (dup) throw new BadRequestException(`工具键已存在: ${data.toolKey}`);
    const created = await this.prisma.sysAgentTool.create({
      data: {
        toolKey: data.toolKey,
        name: data.name,
        type: data.type,
        description: data.description ?? null,
        riskLevel: data.riskLevel ?? 'L1',
        enabled: data.enabled ?? true,
        requireConfirm: data.requireConfirm ?? false,
        applicableAgents: data.applicableAgents ?? [],
        config: (data.config ?? {}) as object,
        sort: data.sort ?? 0,
      },
    });
    return { id: created.id };
  }

  /** 更新工具（不允许改 toolKey） */
  async updateTool(id: number, data: Record<string, unknown>): Promise<void> {
    await this.ensureExists(id);
    const { id: _omitId, toolKey: _omitKey, ...rest }: Record<string, unknown> = data;
    // config 需转 object 满足 Prisma InputJsonValue
    if (rest.config !== undefined) rest.config = rest.config as object;
    await this.prisma.sysAgentTool.update({ where: { id }, data: rest });
  }

  /** 切换启用状态 */
  async toggle(id: number, enabled: boolean): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.sysAgentTool.update({ where: { id }, data: { enabled } });
  }

  /** 删除工具 */
  async remove(id: number): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.sysAgentTool.delete({ where: { id } });
  }

  /** 工具存在性校验 */
  private async ensureExists(id: number) {
    const tool = await this.prisma.sysAgentTool.findUnique({ where: { id } });
    if (!tool) throw new BadRequestException(`工具不存在: ${id}`);
    return tool;
  }

  /** 顶部统计：全部/已启用/高风险(L3·L4)/今日调用 */
  async stats() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [total, enabled, highRisk, callsToday] = await Promise.all([
      this.prisma.sysAgentTool.count(),
      this.prisma.sysAgentTool.count({ where: { enabled: true } }),
      this.prisma.sysAgentTool.count({ where: { riskLevel: { in: TOOL_HIGH_RISK_LEVELS as string[] } } }),
      this.prisma.sysAgentToolCallLog.count({ where: { createTime: { gte: start } } }),
    ]);
    return { total, enabled, highRisk, callsToday };
  }

  /** 左侧分类计数：每种类型的工具数 */
  async categoryCounts() {
    const grouped = await this.prisma.sysAgentTool.groupBy({ by: ['type'], _count: { _all: true } });
    const map = new Map(grouped.map((g) => [g.type, g._count._all]));
    return TOOL_TYPES.map((key) => ({ key, count: map.get(key) ?? 0 }));
  }

  /**
   * 同步前端注册表工具清单（幂等 upsert）。
   *
   * 前端聊天面板挂载时上报当前注册表里真实可调用的工具。按 toolKey 合并：
   * - 新工具：插入，enabled 默认 true（新工具默认可用）；
   * - 已存在：仅更新 name/type/description/riskLevel/requireConfirm/source，
   *   **保留管理员在页面设置的 enabled 开关**（不覆盖用户的启停选择）。
   * 均标记 source=registry，与手动新建（manual）区分。
   * @param tools 注册表工具清单
   * @returns 同步统计 { synced, created, updated }
   */
  async syncRegistry(
    tools: Array<{
      toolKey: string;
      name: string;
      type: string;
      description?: string;
      riskLevel?: string;
      requireConfirm?: boolean;
    }>,
  ): Promise<{ synced: number; created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    for (const t of tools) {
      const exists = await this.prisma.sysAgentTool.findUnique({
        where: { toolKey: t.toolKey },
        select: { id: true },
      });
      if (exists) {
        // 保留 enabled（管理员选择）与 sort/applicableAgents/config，仅刷新元信息
        await this.prisma.sysAgentTool.update({
          where: { toolKey: t.toolKey },
          data: {
            name: t.name,
            type: t.type,
            description: t.description ?? null,
            riskLevel: t.riskLevel ?? 'L1',
            requireConfirm: t.requireConfirm ?? false,
            source: 'registry',
          },
        });
        updated++;
      } else {
        await this.prisma.sysAgentTool.create({
          data: {
            toolKey: t.toolKey,
            name: t.name,
            type: t.type,
            description: t.description ?? null,
            riskLevel: t.riskLevel ?? 'L1',
            enabled: true,
            requireConfirm: t.requireConfirm ?? false,
            applicableAgents: [],
            config: {},
            source: 'registry',
            sort: 0,
          },
        });
        created++;
      }
    }
    this.logger.log(`注册表工具同步完成：共 ${tools.length}，新增 ${created}，更新 ${updated}`);
    return { synced: tools.length, created, updated };
  }

  /**
   * 返回工具治理映射：toolKey → { enabled, requireConfirm }。
   * 供前端下发前过滤禁用工具、并按治理设置覆盖"需确认"。
   */
  async getGovernance(): Promise<Record<string, { enabled: boolean; requireConfirm: boolean }>> {
    const rows = await this.prisma.sysAgentTool.findMany({
      select: { toolKey: true, enabled: true, requireConfirm: true },
    });
    const map: Record<string, { enabled: boolean; requireConfirm: boolean }> = {};
    for (const r of rows) {
      map[r.toolKey] = { enabled: r.enabled, requireConfirm: r.requireConfirm };
    }
    return map;
  }

  /** 记录一次工具调用日志（按 toolKey 反查工具 ID） */
  async recordCall(
    data: { toolKey: string; agent?: string; skill?: string; params?: Record<string, unknown>; success: boolean; durationMs?: number },
    operatorId?: number,
  ): Promise<void> {
    const tool = await this.prisma.sysAgentTool.findUnique({ where: { toolKey: data.toolKey } });
    if (!tool) return; // 无归属工具，不记录
    await this.prisma.sysAgentToolCallLog.create({
      data: {
        toolId: tool.id,
        toolKey: data.toolKey,
        agent: data.agent ?? null,
        skill: data.skill ?? null,
        params: (data.params ?? undefined) as object | undefined,
        success: data.success,
        durationMs: data.durationMs ?? 0,
        operatorId: operatorId ?? null,
      },
    });
  }

  /** 某工具的调用日志分页列表（映射为前端展示结构：含操作人名、格式化时间/耗时） */
  async callLogList(toolKey: string, page = 1, pageSize = 10) {
    const p = Math.max(page, 1);
    const ps = Math.min(Math.max(pageSize, 1), 100);
    const [list, total] = await Promise.all([
      this.prisma.sysAgentToolCallLog.findMany({
        where: { toolKey },
        skip: (p - 1) * ps,
        take: ps,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysAgentToolCallLog.count({ where: { toolKey } }),
    ]);

    // 批量取操作人姓名，避免 N+1；operatorId 可能为空
    const operatorIds = [...new Set(list.map((x) => x.operatorId).filter((x): x is number => x != null))];
    const users = operatorIds.length
      ? await this.prisma.sysUser.findMany({
          where: { id: { in: operatorIds } },
          select: { id: true, name: true, nickName: true, username: true },
        })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.name || u.nickName || u.username || '-']));

    const mapped = list.map((x) => ({
      id: String(x.id),
      toolKey: x.toolKey,
      time: this.formatTime(x.createTime),
      agent: x.agent || '-',
      skill: x.skill || '-',
      params: x.params != null ? JSON.stringify(x.params) : '-',
      success: x.success,
      duration: `${(x.durationMs / 1000).toFixed(2)}s`,
      operator: x.operatorId != null ? (nameById.get(x.operatorId) ?? '-') : '-',
    }));

    return { list: mapped, pagination: { page: p, pageSize: ps, total } };
  }

  /** 格式化时间为 YYYY-MM-DD HH:mm:ss */
  private formatTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }

  /**
   * 工具权限校验：委托统一安全策略校验（SecurityCheckService）。
   * 按工具 type 映射 actionType，把工具风险等级与载荷交给安全策略统一判定，
   * 使工具校验与安全策略（风险等级默认行为/黑白名单/敏感词/审批）保持一致。
   * @param toolKey 工具 key
   * @param action 调用动作（read/write/delete/execute，delete 强制确认）
   * @param payload 调用载荷（含 command/sql 等，供危险内容检测）
   * @param userId 发起用户 ID（写审计用）
   */
  async checkToolPermission(
    toolKey: string,
    action = 'execute',
    payload?: Record<string, unknown>,
    userId?: number,
  ) {
    const tool = await this.prisma.sysAgentTool.findUnique({ where: { toolKey } });
    if (!tool) {
      return { allowed: false, riskLevel: 'L4', requireConfirm: false, reason: '工具不存在或未注册' };
    }
    if (!tool.enabled) {
      return { allowed: false, riskLevel: tool.riskLevel, requireConfirm: false, reason: '工具已禁用，禁止执行' };
    }
    const actionType = TOOL_TYPE_TO_ACTION[tool.type] ?? 'skill';
    const p = (payload ?? {}) as Record<string, unknown>;
    // 委托安全策略统一校验：把工具风险等级、命令/SQL 从载荷提取交给 check
    const result = await this.securityCheck.check(
      {
        actionType,
        riskLevel: tool.riskLevel,
        command: typeof p.command === 'string' ? p.command : undefined,
        sql: typeof p.sql === 'string' ? p.sql : undefined,
        apiPath: typeof p.apiPath === 'string' ? p.apiPath : undefined,
        filePath: typeof p.filePath === 'string' ? p.filePath : undefined,
        toolKey,
        payload,
      },
      userId,
    );
    // delete 动作或工具自身要求确认 → 强制需确认
    const requireConfirm = result.requireConfirm || action === 'delete' || tool.requireConfirm;
    // 映射回工具权限结果结构（前端 ToolPermissionCheckResult）
    return {
      allowed: result.allowed,
      riskLevel: result.riskLevel,
      requireConfirm,
      reason: result.blockedReason,
    };
  }
}
