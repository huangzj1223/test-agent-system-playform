import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { AgentSkillService } from './agent-skill.service';

/** 可移植的技能字段（导出/导入的载体，不含 id/creator/运行统计/tenantId/builtin） */
export interface PortableSkill {
  skillKey: string;
  name: string;
  description?: string;
  capabilities: string[];
  category?: string;
  riskLevel?: string;
  cliCommand?: string;
  triggerKeywords?: string[];
  applicableAgents?: string[];
  sort?: number;
}

/** 导入结果报告 */
export interface ImportReport {
  imported: number;
  skipped: number;
  updated: number;
  renamed: number;
  failed: { skillKey: string; reason: string }[];
}

type ConflictStrategy = 'skip' | 'overwrite' | 'rename';

/**
 * 技能导入/导出服务（从 AgentSkillService 拆出，控制单文件体积）
 *
 * 安全约束：导入本质是批量 createSkill/updateSkill，复用其 assertValidCapabilities
 * （杜绝引用未登记能力，防越权/SSRF）；能力的 http 绑定永远来自后端 catalog，
 * 导入文件里的任何绑定信息都不被信任、不落库。
 */
@Injectable()
export class SkillPortService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skillService: AgentSkillService,
  ) {}

  /**
   * 导出技能为可移植 JSON 数组（剔除 id/creator/运行统计/tenantId/builtin）。
   * @param ids 指定技能 ID（空则导出全部）
   */
  async exportSkills(ids?: number[]): Promise<PortableSkill[]> {
    const rows = await this.prisma.sysAgentSkill.findMany({
      where: ids && ids.length ? { id: { in: ids } } : undefined,
      orderBy: { sort: 'asc' },
    });
    return rows.map((s) => ({
      skillKey: s.skillKey,
      name: s.name,
      description: s.description ?? undefined,
      capabilities: (s.capabilities as string[]) ?? [],
      category: s.category,
      riskLevel: s.riskLevel,
      cliCommand: s.cliCommand ?? undefined,
      triggerKeywords: (s.triggerKeywords as string[]) ?? [],
      applicableAgents: (s.applicableAgents as string[]) ?? [],
      sort: s.sort,
    }));
  }

  /**
   * 批量导入技能。逐条处理：能力合法性由 createSkill/updateSkill 复用校验；
   * skillKey 冲突按策略处理（skip 默认 / overwrite 覆盖非内置 / rename 追加后缀新建）。
   * 单条失败不影响其余，汇总到 failed。
   * @param items 导入项
   * @param strategy 冲突策略（默认 skip）
   * @param creator 操作者
   */
  async importSkills(
    items: PortableSkill[],
    strategy: ConflictStrategy = 'skip',
    creator?: string,
  ): Promise<ImportReport> {
    const report: ImportReport = { imported: 0, skipped: 0, updated: 0, renamed: 0, failed: [] };
    for (const item of items) {
      try {
        await this.importOne(item, strategy, creator, report);
      } catch (e) {
        report.failed.push({ skillKey: item.skillKey, reason: (e as Error)?.message ?? '导入失败' });
      }
    }
    return report;
  }

  /** 处理单条导入（按冲突策略分流）。*/
  private async importOne(
    item: PortableSkill,
    strategy: ConflictStrategy,
    creator: string | undefined,
    report: ImportReport,
  ): Promise<void> {
    const existing = await this.prisma.sysAgentSkill.findUnique({ where: { skillKey: item.skillKey } });
    if (!existing) {
      await this.skillService.createSkill({ ...item, enabled: false }, creator);
      report.imported++;
      return;
    }
    // 冲突处理
    if (strategy === 'skip') {
      report.skipped++;
    } else if (strategy === 'overwrite') {
      if (existing.builtin) {
        report.failed.push({ skillKey: item.skillKey, reason: '内置技能不可覆盖' });
        return;
      }
      await this.skillService.updateSkill(existing.id, this.toUpdatePayload(item), creator);
      report.updated++;
    } else {
      // rename：追加唯一后缀新建
      const newKey = await this.uniqueKey(item.skillKey);
      await this.skillService.createSkill({ ...item, skillKey: newKey, enabled: false }, creator);
      report.renamed++;
    }
  }

  /** 从导入项构造更新载荷（覆盖可移植字段，不含 skillKey/enabled） */
  private toUpdatePayload(item: PortableSkill) {
    return {
      name: item.name,
      description: item.description,
      capabilities: item.capabilities,
      category: item.category,
      riskLevel: item.riskLevel,
      cliCommand: item.cliCommand,
      triggerKeywords: item.triggerKeywords,
      applicableAgents: item.applicableAgents,
      sort: item.sort,
    };
  }

  /**
   * 生成未占用且 ≤64 字符的 skillKey（base-imported、base-imported-2 …），最多尝试 100 次。
   * 先给后缀预留空间再截断 base，保证候选值始终合法（不超长、仍匹配 kebab-case）。
   */
  private async uniqueKey(base: string): Promise<string> {
    const MAX = 64;
    for (let i = 1; i <= 100; i++) {
      const suffix = i === 1 ? '-imported' : `-imported-${i}`;
      const head = base.slice(0, MAX - suffix.length);
      const candidate = `${head}${suffix}`;
      const dup = await this.prisma.sysAgentSkill.findUnique({ where: { skillKey: candidate } });
      if (!dup) return candidate;
    }
    // 极端兜底：时间戳后缀（同样预留空间截断 base）
    const suffix = `-imported-${Date.now()}`;
    return `${base.slice(0, MAX - suffix.length)}${suffix}`;
  }
}
