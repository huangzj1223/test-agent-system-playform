import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

/** 业务限制值（供 service 层校验与前端 UI 限制读取） */
export interface AgentLimits {
  /** maxTokens 硬上限（防护性夹取，真实上限仍受模型能力约束） */
  maxTokensCeiling: number;
  /** 系统提示词最大长度 */
  systemPromptMaxLen: number;
  /** 提示词模板条数上限 */
  templateMaxCount: number;
  /** 单条模板内容最大长度 */
  templateContentMaxLen: number;
  /** 单条模板标题最大长度 */
  templateTitleMaxLen: number;
  /** 模型单次运行超时（毫秒） */
  runTimeoutMs: number;
}

/** 默认界面偏好 */
export interface DefaultUiPrefs {
  fontSize: string;
  density: string;
  showReasoning: boolean;
  showToolCalls: boolean;
}

/** 智能体全局配置聚合体 */
export interface AgentConfig {
  limits: AgentLimits;
  defaultUiPrefs: DefaultUiPrefs;
}

/** 配置键（预留多套配置扩展） */
const CONFIG_KEY = 'agent.chat.config';

/**
 * 智能体全局配置服务
 *
 * 全局单行配置（SysAgentConfig），启动时幂等 seed 默认值并载入内存缓存，
 * getConfig() 同步返回缓存（供高频调用如运行超时/参数夹取零 DB 开销），
 * reload() 在配置变更后刷新缓存。运维可直接改库记录，重启或 reload 后生效。
 */
@Injectable()
export class AgentConfigService implements OnModuleInit {
  private readonly logger = new Logger(AgentConfigService.name);
  /** 内存缓存：启动 seed 后填充，getConfig 同步返回 */
  private cache: AgentConfig = AgentConfigService.defaults();

  constructor(private readonly prisma: PrismaService) {}

  /** 内置默认配置（seed 与兜底共用） */
  static defaults(): AgentConfig {
    return {
      limits: {
        maxTokensCeiling: 128_000,
        systemPromptMaxLen: 4000,
        templateMaxCount: 50,
        templateContentMaxLen: 2000,
        templateTitleMaxLen: 50,
        runTimeoutMs: 120_000,
      },
      defaultUiPrefs: {
        fontSize: 'medium',
        density: 'comfortable',
        showReasoning: true,
        showToolCalls: true,
      },
    };
  }

  /** 启动时幂等 seed 默认配置并载入缓存（失败不阻断启动，回退内置默认） */
  async onModuleInit(): Promise<void> {
    try {
      const existing = await this.prisma.sysAgentConfig.findUnique({
        where: { configKey: CONFIG_KEY },
      });
      if (!existing) {
        await this.prisma.sysAgentConfig.create({
          data: { configKey: CONFIG_KEY, settings: AgentConfigService.defaults() as unknown as object },
        });
        this.logger.log('已初始化智能体全局配置默认值');
      }
      await this.reload();
    } catch (e) {
      this.logger.error(`智能体全局配置初始化失败，使用内置默认: ${(e as Error).message}`);
    }
  }

  /**
   * 从数据库重新载入配置到缓存。与内置默认做深合并，兼容后续新增字段
   * （旧记录缺字段时回退默认）。
   */
  async reload(): Promise<void> {
    const row = await this.prisma.sysAgentConfig.findUnique({ where: { configKey: CONFIG_KEY } });
    const defaults = AgentConfigService.defaults();
    const stored = (row?.settings ?? {}) as Partial<AgentConfig>;
    this.cache = {
      limits: { ...defaults.limits, ...(stored.limits ?? {}) },
      defaultUiPrefs: { ...defaults.defaultUiPrefs, ...(stored.defaultUiPrefs ?? {}) },
    };
  }

  /** 同步返回当前配置缓存 */
  getConfig(): AgentConfig {
    return this.cache;
  }

  /** 便捷取限制值 */
  getLimits(): AgentLimits {
    return this.cache.limits;
  }

  /** 便捷取默认界面偏好 */
  getDefaultUiPrefs(): DefaultUiPrefs {
    return this.cache.defaultUiPrefs;
  }
}
