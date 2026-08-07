import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

/** 变更类型白名单（DB 层为裸 String，写入侧在此校验） */
export const VERSION_CHANGE_TYPES = ['create', 'update', 'rollback'] as const;
export type VersionChangeType = (typeof VERSION_CHANGE_TYPES)[number];

/** 技能可快照/可回滚的字段（不含 skillKey/builtin/version 等不可变或自管字段） */
export interface SkillSnapshot {
  name: string;
  description: string | null;
  capabilities: unknown;
  category: string;
  riskLevel: string;
  cliCommand: string | null;
  triggerKeywords: unknown;
  applicableAgents: unknown;
  enabled: boolean;
  sort: number;
}

/**
 * 递增版本修订号：vX.Y.Z → vX.Y.(Z+1)；无法解析时回退 v1.0.1。
 * 导出为独立函数，供 AgentSkillService.updateSkill 与本服务 rollback 共用。
 * @param current 当前版本字符串
 */
export function bumpVersion(current: string): string {
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(current || '');
  if (!m) return 'v1.0.1';
  return `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

/** 从技能行提取快照字段 */
function toSnapshot(skill: Record<string, unknown>): SkillSnapshot {
  return {
    name: skill.name as string,
    description: (skill.description as string | null) ?? null,
    capabilities: skill.capabilities,
    category: skill.category as string,
    riskLevel: skill.riskLevel as string,
    cliCommand: (skill.cliCommand as string | null) ?? null,
    triggerKeywords: skill.triggerKeywords,
    applicableAgents: skill.applicableAgents,
    enabled: skill.enabled as boolean,
    sort: skill.sort as number,
  };
}

/**
 * 技能版本历史服务（从 AgentSkillService 拆出，控制单文件体积）
 *
 * 职责：每次技能变更写全字段快照到 sys_agent_skill_version；提供版本列表与回滚。
 * 回滚 = 用历史快照覆盖当前技能字段（skillKey/builtin 不变），version 继续递增（不倒退），
 * 并再记一条 rollback 快照，形成可追溯链（不做物理删除）。
 */
@Injectable()
export class SkillVersionService {
  private readonly logger = new Logger(SkillVersionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 写一条版本快照。失败仅记日志、不抛出（不阻断主流程的技能创建/更新）。
   * @param skill 技能当前行（含 version 字段作为快照版本号）
   * @param changeType 变更类型（create/update/rollback）
   * @param summary 变更摘要
   * @param operator 操作者
   */
  async writeSnapshot(
    skill: Record<string, unknown>,
    changeType: VersionChangeType,
    summary?: string,
    operator?: string,
  ): Promise<void> {
    try {
      await this.prisma.sysAgentSkillVersion.create({
        data: {
          skillId: skill.id as number,
          version: (skill.version as string) ?? 'v1.0.0',
          snapshot: toSnapshot(skill) as unknown as object,
          changeType,
          changeSummary: summary ? summary.slice(0, 300) : null,
          operator: operator ?? null,
        },
      });
    } catch (e) {
      this.logger.error(`写版本快照失败(skillId=${skill.id as number}): ${(e as Error).message}`);
    }
  }

  /**
   * 某技能的版本历史分页（按时间倒序）。
   * @param skillId 技能 ID
   * @param page 页码
   * @param pageSize 每页条数
   */
  async listVersions(skillId: number, page = 1, pageSize = 10) {
    const p = Math.max(page, 1);
    const ps = Math.min(Math.max(pageSize, 1), 100);
    const [list, total] = await Promise.all([
      this.prisma.sysAgentSkillVersion.findMany({
        where: { skillId },
        skip: (p - 1) * ps,
        take: ps,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysAgentSkillVersion.count({ where: { skillId } }),
    ]);
    return { list, pagination: { page: p, pageSize: ps, total } };
  }

  /**
   * 回滚技能到指定历史版本：用其快照覆盖当前字段（skillKey/builtin 不变），
   * version 继续递增（不倒退），并记一条 rollback 快照。
   * @param skillId 技能 ID
   * @param versionId 目标历史版本记录 ID
   * @param operator 操作者
   */
  async rollback(skillId: number, versionId: number, operator?: string): Promise<void> {
    const skill = await this.prisma.sysAgentSkill.findUnique({ where: { id: skillId } });
    if (!skill) {
      throw new BadRequestException(`技能不存在: ${skillId}`);
    }
    const ver = await this.prisma.sysAgentSkillVersion.findUnique({ where: { id: versionId } });
    if (!ver || ver.skillId !== skillId) {
      throw new BadRequestException('版本记录不存在或不属于该技能');
    }
    const snap = ver.snapshot as unknown as SkillSnapshot;
    const nextVersion = bumpVersion(skill.version);
    const updated = await this.prisma.sysAgentSkill.update({
      where: { id: skillId },
      data: {
        name: snap.name,
        description: snap.description,
        capabilities: snap.capabilities as object,
        category: snap.category,
        riskLevel: snap.riskLevel,
        cliCommand: snap.cliCommand,
        triggerKeywords: snap.triggerKeywords as object,
        applicableAgents: snap.applicableAgents as object,
        enabled: snap.enabled,
        sort: snap.sort,
        version: nextVersion,
      },
    });
    await this.writeSnapshot(updated, 'rollback', `回滚自 ${ver.version}`, operator);
  }
}
