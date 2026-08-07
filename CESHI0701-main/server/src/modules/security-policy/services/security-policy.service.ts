import { Injectable, OnModuleInit, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { SECURITY_CONFIG_KEYS } from '../catalog/security-policy.enums';

/** 默认全局安全策略 */
const DEFAULT_GLOBAL = {
  highRiskDoubleConfirm: true,
  commandTimeoutSeconds: 120,
  fileDirLimitEnabled: true,
  dbWriteApproval: true,
  forceAuditLog: true,
};

/** 默认沙箱策略（命令/目录/表名单由黑白名单表托管，此处不再冗余存储） */
const DEFAULT_SANDBOX = {
  cli: { enabled: true, allowSudo: false, allowNetwork: false, allowBackgroundProcess: false, timeoutSeconds: 120, maxOutputLength: 20000 },
  file: { enabled: true, allowRead: true, allowWrite: true, allowDelete: false, allowOverwrite: true, maxFileSizeMB: 20, allowedExtensions: ['.ts', '.tsx', '.vue', '.json', '.md', '.yaml', '.sql'] },
  database: { enabled: true, readonlyByDefault: true, allowInsert: false, allowUpdate: false, allowDelete: false, maxRows: 1000, timeoutSeconds: 30 },
  page: { enabled: true, allowClick: true, allowInput: true, allowSubmit: false, allowDeleteAction: false, allowNavigation: true, requireSummaryBeforeRiskAction: true },
};

/** 默认审计策略 */
const DEFAULT_AUDIT = {
  recordConversation: true,
  recordSkillCall: true,
  recordToolExecution: true,
  recordMemoryHit: true,
  recordApproval: true,
  retentionDays: 180,
  failureAlert: true,
  highRiskAlert: true,
  maskSensitiveData: true,
};

/**
 * 安全策略服务
 *
 * 管理风险等级 / 审批规则 / 黑白名单 / 敏感词 / 全局·沙箱·审计聚合配置的读写。
 * 启动时幂等 seed 风险等级 L1-L4、三类聚合配置默认值与示例规则数据。
 * 黑白名单表是命令/目录/表名单的唯一权威源，沙箱配置只引用不冗余。
 */
@Injectable()
export class SecurityPolicyService implements OnModuleInit {
  private readonly logger = new Logger(SecurityPolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 启动时幂等初始化：风险等级 + 三类聚合配置 + 示例数据 */
  async onModuleInit(): Promise<void> {
    try {
      await this.seedRiskPolicies();
      await this.seedConfigs();
      await this.seedExamples();
    } catch (e) {
      this.logger.error(`安全策略种子初始化失败: ${(e as Error).message}`);
    }
  }

  /** 幂等 seed 风险等级 L1-L4（已存在则跳过，不覆盖用户修改） */
  private async seedRiskPolicies(): Promise<void> {
    const count = await this.prisma.sysAgentRiskPolicy.count();
    if (count > 0) return;
    await this.prisma.sysAgentRiskPolicy.createMany({
      data: [
        { level: 'L1', name: '只读查询', description: '仅查询，不修改数据或配置', examples: ['查询报表', '查看日志', '数据筛选'], approvalRequirement: '无需审批', defaultAction: 'allow', sort: 1 },
        { level: 'L2', name: '低风险写入', description: '有限范围内的写入操作', examples: ['新增记录', '更新非关键字段', '导出数据'], approvalRequirement: '自动通过或可配置审批', defaultAction: 'allow', sort: 2 },
        { level: 'L3', name: '写入修改', description: '修改重要数据或配置', examples: ['更新状态', '修改配置', '批量导入'], approvalRequirement: '需人工审批', defaultAction: 'require_approval', sort: 3 },
        { level: 'L4', name: '高风险执行', description: '可能影响系统安全或稳定性', examples: ['删除数据', '执行命令', '发布上线', '数据库变更'], approvalRequirement: '需人工审批或二次确认', defaultAction: 'deny', sort: 4 },
      ],
    });
    this.logger.log('已初始化风险等级 L1-L4');
  }

  /** 幂等 seed 三类聚合配置默认值 */
  private async seedConfigs(): Promise<void> {
    const defaults: Record<string, object> = {
      [SECURITY_CONFIG_KEYS.global]: DEFAULT_GLOBAL,
      [SECURITY_CONFIG_KEYS.sandbox]: DEFAULT_SANDBOX,
      [SECURITY_CONFIG_KEYS.audit]: DEFAULT_AUDIT,
    };
    for (const [configKey, settings] of Object.entries(defaults)) {
      const exists = await this.prisma.sysAgentSecurityConfig.findUnique({ where: { configKey } });
      if (!exists) {
        await this.prisma.sysAgentSecurityConfig.create({ data: { configKey, settings } });
      }
    }
  }

  /** 幂等 seed 示例数据（审批规则/黑白名单/敏感词，仅当各自表为空时写入） */
  private async seedExamples(): Promise<void> {
    if ((await this.prisma.sysAgentApprovalRule.count()) === 0) {
      await this.prisma.sysAgentApprovalRule.createMany({
        data: [
          { name: 'CLI 高风险命令审批', scope: 'CLI 工具', riskLevels: ['L3', 'L4'], approvalMode: 'manual', approverRole: '系统管理员', timeoutMinutes: 30, timeoutAction: 'deny', sort: 1 },
          { name: '数据库写入审批', scope: '数据库', riskLevels: ['L2', 'L3', 'L4'], approvalMode: 'manual', approverRole: '项目负责人', timeoutMinutes: 30, timeoutAction: 'deny', sort: 2 },
          { name: '文件覆盖审批', scope: '文件系统', riskLevels: ['L2', 'L3'], approvalMode: 'confirm', approverRole: '当前用户', timeoutMinutes: 10, timeoutAction: 'cancel', sort: 3 },
          { name: '记忆写入审批', scope: '记忆写入', riskLevels: ['L2', 'L3'], approvalMode: 'confirm', approverRole: '用户本人', timeoutMinutes: 10, timeoutAction: 'cancel', sort: 4 },
        ],
      });
    }
    if ((await this.prisma.sysAgentSecurityList.count()) === 0) {
      await this.prisma.sysAgentSecurityList.createMany({
        data: [
          { listType: 'command_white', value: 'npm run generate:backend', description: '生成后端代码', riskLevel: 'L2', sort: 1 },
          { listType: 'command_white', value: 'npm run lint', description: '代码检查', riskLevel: 'L1', sort: 2 },
          { listType: 'command_black', value: 'rm -rf /', description: '递归删除根目录', riskLevel: 'L4', sort: 1 },
          { listType: 'command_black', value: 'DROP DATABASE', description: '删除数据库', riskLevel: 'L4', sort: 2 },
          { listType: 'dir_white', value: '/workspace/project/src', description: '源码目录', sort: 1 },
          { listType: 'api_db_black', value: '/api/system/delete', description: '系统删除接口', riskLevel: 'L4', sort: 1 },
          { listType: 'api_db_black', value: 'sys_user.password', description: '用户密码字段', riskLevel: 'L4', sort: 2 },
        ],
      });
    }
    if ((await this.prisma.sysAgentSensitiveRule.count()) === 0) {
      await this.prisma.sysAgentSensitiveRule.createMany({
        data: [
          { type: '密码字段', pattern: 'password / passwd / pwd', action: 'mask', scopes: ['日志', '记忆', '工具参数'], sort: 1 },
          { type: 'Token / API Key', pattern: 'sk-* / token / api_key', action: 'deny_memory', scopes: ['日志', '记忆'], sort: 2 },
          { type: '身份证号', pattern: '身份证号码规则', action: 'mask', scopes: ['日志', '对话'], sort: 3 },
          { type: '数据库连接串', pattern: 'jdbc: / mysql:// / postgres://', action: 'audit', scopes: ['工具参数', '日志'], sort: 4 },
        ],
      });
    }
  }

  /** 读取聚合配置（无记录返回默认值，并与默认浅合并兼容新增字段） */
  private async getConfig(configKey: string, defaults: object): Promise<Record<string, unknown>> {
    const row = await this.prisma.sysAgentSecurityConfig.findUnique({ where: { configKey } });
    const stored = (row?.settings ?? {}) as Record<string, unknown>;
    return { ...defaults, ...stored };
  }

  /** 保存聚合配置（upsert，与现有值浅合并，避免只提交部分字段时清空其他） */
  private async saveConfig(configKey: string, settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    const current = await this.prisma.sysAgentSecurityConfig.findUnique({ where: { configKey } });
    const merged = { ...((current?.settings ?? {}) as Record<string, unknown>), ...settings };
    await this.prisma.sysAgentSecurityConfig.upsert({
      where: { configKey },
      create: { configKey, settings: merged as object },
      update: { settings: merged as object },
    });
    return merged;
  }

  /** 读取全局策略 */
  getGlobal() {
    return this.getConfig(SECURITY_CONFIG_KEYS.global, DEFAULT_GLOBAL);
  }

  /** 保存全局策略 */
  saveGlobal(settings: Record<string, unknown>) {
    return this.saveConfig(SECURITY_CONFIG_KEYS.global, settings);
  }

  /** 读取沙箱策略 */
  getSandbox() {
    return this.getConfig(SECURITY_CONFIG_KEYS.sandbox, DEFAULT_SANDBOX);
  }

  /** 保存沙箱策略 */
  saveSandbox(settings: Record<string, unknown>) {
    return this.saveConfig(SECURITY_CONFIG_KEYS.sandbox, settings);
  }

  /** 读取审计策略 */
  getAudit() {
    return this.getConfig(SECURITY_CONFIG_KEYS.audit, DEFAULT_AUDIT);
  }

  /** 保存审计策略 */
  saveAudit(settings: Record<string, unknown>) {
    return this.saveConfig(SECURITY_CONFIG_KEYS.audit, settings);
  }

  /** 风险等级列表（按 sort 升序） */
  listRisk() {
    return this.prisma.sysAgentRiskPolicy.findMany({ orderBy: { sort: 'asc' } });
  }

  /** 保存风险等级（按 level upsert） */
  async saveRisk(data: {
    level: string;
    name: string;
    description?: string;
    examples: string[];
    approvalRequirement?: string;
    defaultAction: string;
    enabled?: boolean;
    sort?: number;
  }): Promise<void> {
    const payload = {
      name: data.name,
      description: data.description ?? null,
      examples: data.examples,
      approvalRequirement: data.approvalRequirement ?? null,
      defaultAction: data.defaultAction,
      enabled: data.enabled ?? true,
      sort: data.sort ?? 0,
    };
    await this.prisma.sysAgentRiskPolicy.upsert({
      where: { level: data.level },
      create: { level: data.level, ...payload },
      update: payload,
    });
  }

  /** 删除风险等级 */
  async deleteRisk(level: string): Promise<void> {
    const exists = await this.prisma.sysAgentRiskPolicy.findUnique({ where: { level } });
    if (!exists) throw new BadRequestException(`风险等级不存在: ${level}`);
    await this.prisma.sysAgentRiskPolicy.delete({ where: { level } });
  }

  /** 审批规则列表（按 sort 升序） */
  listApproval() {
    return this.prisma.sysAgentApprovalRule.findMany({ orderBy: { sort: 'asc' } });
  }

  /** 新建审批规则 */
  async addApproval(data: {
    name: string;
    scope: string;
    riskLevels: string[];
    approvalMode: string;
    approverRole: string;
    timeoutMinutes?: number;
    timeoutAction: string;
    enabled?: boolean;
    sort?: number;
  }): Promise<{ id: number }> {
    const created = await this.prisma.sysAgentApprovalRule.create({
      data: {
        name: data.name,
        scope: data.scope,
        riskLevels: data.riskLevels,
        approvalMode: data.approvalMode,
        approverRole: data.approverRole,
        timeoutMinutes: data.timeoutMinutes ?? 30,
        timeoutAction: data.timeoutAction,
        enabled: data.enabled ?? true,
        sort: data.sort ?? 0,
      },
    });
    return { id: created.id };
  }

  /** 更新审批规则 */
  async updateApproval(id: number, data: Record<string, unknown>): Promise<void> {
    await this.ensureApproval(id);
    await this.prisma.sysAgentApprovalRule.update({ where: { id }, data });
  }

  /** 切换审批规则启用状态 */
  async toggleApproval(id: number, enabled: boolean): Promise<void> {
    await this.ensureApproval(id);
    await this.prisma.sysAgentApprovalRule.update({ where: { id }, data: { enabled } });
  }

  /** 删除审批规则 */
  async deleteApproval(id: number): Promise<void> {
    await this.ensureApproval(id);
    await this.prisma.sysAgentApprovalRule.delete({ where: { id } });
  }

  /** 审批规则存在性校验 */
  private async ensureApproval(id: number) {
    const row = await this.prisma.sysAgentApprovalRule.findUnique({ where: { id } });
    if (!row) throw new BadRequestException(`审批规则不存在: ${id}`);
    return row;
  }

  /** 按名单类型查询条目（按 sort 升序） */
  listByType(listType: string) {
    return this.prisma.sysAgentSecurityList.findMany({ where: { listType }, orderBy: { sort: 'asc' } });
  }

  /** 新建名单条目 */
  async addListItem(data: {
    listType: string;
    value: string;
    description?: string;
    riskLevel?: string;
    enabled?: boolean;
    sort?: number;
  }): Promise<{ id: number }> {
    const created = await this.prisma.sysAgentSecurityList.create({
      data: {
        listType: data.listType,
        value: data.value,
        description: data.description ?? null,
        riskLevel: data.riskLevel ?? null,
        enabled: data.enabled ?? true,
        sort: data.sort ?? 0,
      },
    });
    return { id: created.id };
  }

  /** 更新名单条目 */
  async updateListItem(id: number, data: Record<string, unknown>): Promise<void> {
    await this.ensureListItem(id);
    // 剔除主键，避免误更新
    const { id: _omit, ...rest } = data as { id?: number };
    await this.prisma.sysAgentSecurityList.update({ where: { id }, data: rest });
  }

  /** 切换名单条目启用状态 */
  async toggleListItem(id: number, enabled: boolean): Promise<void> {
    await this.ensureListItem(id);
    await this.prisma.sysAgentSecurityList.update({ where: { id }, data: { enabled } });
  }

  /** 删除名单条目 */
  async deleteListItem(id: number): Promise<void> {
    await this.ensureListItem(id);
    await this.prisma.sysAgentSecurityList.delete({ where: { id } });
  }

  /** 名单条目存在性校验 */
  private async ensureListItem(id: number) {
    const row = await this.prisma.sysAgentSecurityList.findUnique({ where: { id } });
    if (!row) throw new BadRequestException(`名单条目不存在: ${id}`);
    return row;
  }

  /** 聚合黑白名单四区（供 overview 与前端一次拉取） */
  async blackWhiteList() {
    const all = await this.prisma.sysAgentSecurityList.findMany({ orderBy: { sort: 'asc' } });
    return {
      commandWhitelist: all.filter((i) => i.listType === 'command_white'),
      commandBlacklist: all.filter((i) => i.listType === 'command_black'),
      dirWhitelist: all.filter((i) => i.listType === 'dir_white'),
      apiDbBlacklist: all.filter((i) => i.listType === 'api_db_black'),
    };
  }

  /** 敏感词列表（按 sort 升序） */
  listSensitive() {
    return this.prisma.sysAgentSensitiveRule.findMany({ orderBy: { sort: 'asc' } });
  }

  /** 敏感词统计（总数/已启用/今日拦截/待处理；后两者当前无来源，先返回 0 占位） */
  async sensitiveStats() {
    const [total, enabled] = await Promise.all([
      this.prisma.sysAgentSensitiveRule.count(),
      this.prisma.sysAgentSensitiveRule.count({ where: { enabled: true } }),
    ]);
    // 今日拦截：审计日志中被敏感词拦截的当日条数（阶段2后可用；此处安全兜底为 0）
    let blockedToday = 0;
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      blockedToday = await this.prisma.sysAgentAuditLog.count({
        where: { allowed: false, createTime: { gte: start } },
      });
    } catch {
      blockedToday = 0;
    }
    return { total, enabled, blockedToday, pending: 0 };
  }

  /** 新建敏感词规则 */
  async addSensitive(data: {
    type: string;
    pattern: string;
    action: string;
    scopes: string[];
    enabled?: boolean;
    sort?: number;
  }): Promise<{ id: number }> {
    const created = await this.prisma.sysAgentSensitiveRule.create({
      data: {
        type: data.type,
        pattern: data.pattern,
        action: data.action,
        scopes: data.scopes,
        enabled: data.enabled ?? true,
        sort: data.sort ?? 0,
      },
    });
    return { id: created.id };
  }

  /** 更新敏感词规则 */
  async updateSensitive(id: number, data: Record<string, unknown>): Promise<void> {
    await this.ensureSensitive(id);
    const { id: _omit, ...rest } = data as { id?: number };
    await this.prisma.sysAgentSensitiveRule.update({ where: { id }, data: rest });
  }

  /** 切换敏感词规则启用状态 */
  async toggleSensitive(id: number, enabled: boolean): Promise<void> {
    await this.ensureSensitive(id);
    await this.prisma.sysAgentSensitiveRule.update({ where: { id }, data: { enabled } });
  }

  /** 删除敏感词规则 */
  async deleteSensitive(id: number): Promise<void> {
    await this.ensureSensitive(id);
    await this.prisma.sysAgentSensitiveRule.delete({ where: { id } });
  }

  /** 敏感词规则存在性校验 */
  private async ensureSensitive(id: number) {
    const row = await this.prisma.sysAgentSensitiveRule.findUnique({ where: { id } });
    if (!row) throw new BadRequestException(`敏感词规则不存在: ${id}`);
    return row;
  }

  /** 一次性拉取全部安全策略数据（前端初始化用） */
  async overview() {
    const [riskPolicies, approvalRules, blackWhiteList, sensitiveRules, sensitiveStats, global, sandbox, audit] =
      await Promise.all([
        this.listRisk(),
        this.listApproval(),
        this.blackWhiteList(),
        this.listSensitive(),
        this.sensitiveStats(),
        this.getGlobal(),
        this.getSandbox(),
        this.getAudit(),
      ]);
    return { riskPolicies, approvalRules, blackWhiteList, sensitiveRules, sensitiveStats, global, sandbox, audit };
  }
}
