import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { SaveChatSettingDto } from '../dto/chat-setting.dto';
import { AgentConfigService } from './agent-config.service';

/** 对话参数 */
export interface ChatParams {
  temperature?: number;
  maxTokens?: number;
  systemPrompt: string;
}

/** 界面偏好 */
export interface UiPrefs {
  fontSize: string;
  density: string;
  showReasoning: boolean;
  showToolCalls: boolean;
}

/** 单条提示词模板 */
export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
}

/** 当前主用模型选择（定位到具体供应商配置下的具体模型） */
export interface CurrentModelSelection {
  /** 供应商配置 ID */
  providerConfigId: number;
  /** 模型主键 ID */
  modelId: number;
}

/** 聊天设置聚合体 */
export interface ChatSetting {
  chatParams: ChatParams;
  uiPrefs: UiPrefs;
  promptTemplates: PromptTemplate[];
  /** 当前主用模型选择（null 表示未选择，跨设备沿用上次选择） */
  currentModel: CurrentModelSelection | null;
}

/**
 * 智能体聊天设置服务
 *
 * 按 userId 一人一行，settings 聚合存 JSON（对话参数 / 界面偏好 / 提示词模板）。
 * 读取时无记录返回内置默认值；保存走 upsert，与 DTO 白名单校验配合确保只落合法字段。
 */
@Injectable()
export class ChatSettingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentConfig: AgentConfigService,
  ) {}

  /** 内置默认设置（新用户或无记录时返回，保证前端始终拿到完整结构） */
  private defaults(): ChatSetting {
    return {
      chatParams: { systemPrompt: '' },
      // 默认界面偏好取自全局配置（可运行时调），而非硬编码
      uiPrefs: { ...this.agentConfig.getDefaultUiPrefs() },
      promptTemplates: [],
      currentModel: null,
    };
  }

  /**
   * 读取某用户的聊天设置，无记录返回默认值。
   * 对库中 JSON 与默认值做浅合并，兼容后续新增字段（旧记录缺字段时回退默认）。
   * @param userId 用户 ID
   */
  async get(userId: number): Promise<ChatSetting> {
    const row = await this.prisma.sysAgentChatSetting.findUnique({ where: { userId } });
    const defaults = this.defaults();
    if (!row) return defaults;
    const stored = (row.settings ?? {}) as Partial<ChatSetting>;
    return {
      chatParams: { ...defaults.chatParams, ...(stored.chatParams ?? {}) },
      uiPrefs: { ...defaults.uiPrefs, ...(stored.uiPrefs ?? {}) },
      promptTemplates: Array.isArray(stored.promptTemplates)
        ? stored.promptTemplates
        : defaults.promptTemplates,
      currentModel: this.normalizeCurrentModel(stored.currentModel),
    };
  }

  /**
   * 归一化当前模型选择：仅接受两个正整数 ID 的结构，其余（含旧记录缺字段）一律回退 null。
   * @param value 库中存储的原始值
   * @returns 合法选择或 null
   */
  private normalizeCurrentModel(value: unknown): CurrentModelSelection | null {
    if (!value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>;
    if (
      typeof v.providerConfigId === 'number' &&
      Number.isInteger(v.providerConfigId) &&
      v.providerConfigId > 0 &&
      typeof v.modelId === 'number' &&
      Number.isInteger(v.modelId) &&
      v.modelId > 0
    ) {
      return { providerConfigId: v.providerConfigId, modelId: v.modelId };
    }
    return null;
  }

  /**
   * 保存（upsert）某用户的聊天设置。
   * 与现有设置合并：DTO 未提供的部分保持原值，避免只提交单个页签时清空其他设置。
   * @param userId 用户 ID
   * @param dto 待保存字段（已经过白名单与区间校验）
   */
  async save(userId: number, dto: SaveChatSettingDto): Promise<ChatSetting> {
    const current = await this.get(userId);
    const merged: ChatSetting = {
      chatParams: this.mergeChatParams(current.chatParams, dto.chatParams),
      uiPrefs: { ...current.uiPrefs, ...(dto.uiPrefs ?? {}) },
      promptTemplates: dto.promptTemplates ?? current.promptTemplates,
      // currentModel 三态：键缺省=保持原值；null=清除选择；对象=更新为该选择（归一校验）
      currentModel:
        dto.currentModel === undefined
          ? current.currentModel
          : this.normalizeCurrentModel(dto.currentModel),
    };
    // 用全局配置的限制值做 service 层校验（DTO 装饰器只是编译期宽松防御上限，
    // 真实业务限制可运行时调整，故在此按数据库配置二次校验）
    this.assertWithinLimits(merged);
    await this.prisma.sysAgentChatSetting.upsert({
      where: { userId },
      create: { userId, settings: merged as unknown as object },
      update: { settings: merged as unknown as object },
    });
    return merged;
  }

  /**
   * 合并对话参数，区分三种入参语义：
   * - 字段缺省（undefined）：保持原值不动；
   * - 字段为 null：清除该字段、恢复模型默认（合并结果中删除该键）；
   * - 字段为具体值：覆盖。
   * systemPrompt 始终为字符串，直接覆盖（缺省保持原值）。
   * @param current 当前对话参数
   * @param patch DTO 传入的对话参数（可能含 null 表示清除）
   */
  private mergeChatParams(
    current: ChatParams,
    patch?: { temperature?: number | null; maxTokens?: number | null; systemPrompt?: string },
  ): ChatParams {
    const next: ChatParams = { ...current };
    if (!patch) return next;

    if ('temperature' in patch) {
      if (patch.temperature === null) delete next.temperature;
      else if (patch.temperature !== undefined) next.temperature = patch.temperature;
    }
    if ('maxTokens' in patch) {
      if (patch.maxTokens === null) delete next.maxTokens;
      else if (patch.maxTokens !== undefined) next.maxTokens = patch.maxTokens;
    }
    if (patch.systemPrompt !== undefined) next.systemPrompt = patch.systemPrompt;
    return next;
  }

  /**
   * 按全局配置的限制值校验合并后的设置，超限抛 400。
   * @param setting 合并后的完整设置
   */
  private assertWithinLimits(setting: ChatSetting): void {
    const limits = this.agentConfig.getLimits();
    if ((setting.chatParams.systemPrompt?.length ?? 0) > limits.systemPromptMaxLen) {
      throw new BadRequestException(`系统提示词长度不能超过 ${limits.systemPromptMaxLen} 字`);
    }
    if (setting.chatParams.maxTokens !== undefined && setting.chatParams.maxTokens > limits.maxTokensCeiling) {
      throw new BadRequestException(`最大输出长度不能超过 ${limits.maxTokensCeiling}`);
    }
    const tpls = setting.promptTemplates;
    if (tpls.length > limits.templateMaxCount) {
      throw new BadRequestException(`提示词模板不能超过 ${limits.templateMaxCount} 条`);
    }
    for (const t of tpls) {
      if (t.title.length > limits.templateTitleMaxLen) {
        throw new BadRequestException(`模板标题长度不能超过 ${limits.templateTitleMaxLen} 字`);
      }
      if (t.content.length > limits.templateContentMaxLen) {
        throw new BadRequestException(`模板内容长度不能超过 ${limits.templateContentMaxLen} 字`);
      }
    }
  }
}
