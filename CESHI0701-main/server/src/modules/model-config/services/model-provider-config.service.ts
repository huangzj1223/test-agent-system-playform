import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';
import { encryptSecret, decryptSecret } from '@/common/utils/crypto.util';

/** resolveById 返回的内部解密结果（仅供其他模块内部调用，绝不进 HTTP 响应） */
export interface ResolvedModelContext {
  /** 供应商类型 */
  provider: string;
  /** API Endpoint（baseURL） */
  apiEndpoint: string;
  /** 解密后的 API Key 明文 */
  apiKey: string;
  /** 协议类型 */
  protocolType: string;
  /** API 版本（可空） */
  apiVersion: string | null;
  /** 供应商侧模型 ID（当传入 modelId 时校验其归属并回填） */
  modelId?: string;
  /** 该模型配置的最大输出 token（用于回填请求 max_tokens；Anthropic 系模型强制要求，可空则由调用方兜底） */
  maxOutputTokens?: number | null;
  /** 该模型是否支持工具调用（false 时调用方不下发 tools，避免不支持工具的模型报错） */
  supportTools?: boolean;
}

/**
 * 供应商配置服务
 *
 * 继承通用 CRUD，并叠加三项安全逻辑：
 * 1. 写入前将明文 apiKey 加密为 apiKeyCipher；
 * 2. 对外投影统一剔除 apiKeyCipher，仅暴露 hasApiKey；
 * 3. resolveById 供内部模块解密取用，明文不外泄。
 */
@Injectable()
export class ModelProviderConfigService extends BaseService {
  constructor(
    protected prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma, 'modelProviderConfig');
  }

  /** 读取加密口令；未配置时抛错（不降级为明文） */
  private getEncKey(): string {
    const key = this.configService.get<string>('MODEL_CONFIG_ENC_KEY');
    if (!key) {
      throw new Error('MODEL_CONFIG_ENC_KEY 未配置');
    }
    return key;
  }

  /**
   * 把一条含 apiKeyCipher 的记录脱敏为对外形状：剔除密文，补 hasApiKey
   * @param row 原始记录（可能含 apiKeyCipher）
   * @returns 脱敏后的对象
   */
  private toSafe<T extends { apiKeyCipher?: string | null }>(
    row: T,
  ): Omit<T, 'apiKeyCipher'> & { hasApiKey: boolean } {
    const { apiKeyCipher, ...rest } = row;
    return { ...rest, hasApiKey: !!apiKeyCipher };
  }

  /**
   * 分页查询（脱敏）：查询含 apiKeyCipher 以计算 hasApiKey，返回前统一剔除
   * @param options 分页参数
   * @param where 查询条件
   */
  async pageSafe(options: any, where?: any) {
    const result = await this.page(options, where);
    return {
      ...result,
      list: (result.list as any[]).map((row) => this.toSafe(row)),
    };
  }

  /**
   * 一次性返回全部启用/停用供应商配置及其模型（脱敏）。
   * 供前端聊天面板首屏加载：单查询 include 模型，消除「先查供应商列表、再逐个查模型」的 N+1 串行往返。
   * 安全：每个供应商仍走 toSafe 剔除 apiKeyCipher，仅暴露 hasApiKey；模型不含敏感字段，原样带出。
   * 排序：供应商与模型均按 sort 升序，与配置管理页/下拉现有展示顺序一致。
   * @returns 供应商数组，每项含脱敏字段与其 models 列表
   */
  async listAllWithModels() {
    const rows = await this.list(undefined, undefined, { models: true });
    const mapped: Record<string, any>[] = (rows as any[]).map((row) => {
      const safe = this.toSafe(row) as Record<string, any>;
      const models = Array.isArray(row.models)
        ? [...row.models].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        : [];
      return { ...safe, models };
    });
    return [...mapped].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }

  /**
   * 详情查询（脱敏）
   * @param id 主键
   */
  async infoSafe(id: number) {
    const row = await this.info(id);
    return row ? this.toSafe(row as any) : null;
  }

  /**
   * 新增配置：明文 apiKey 加密后落库，返回脱敏结果
   * @param dto 新增数据（含明文 apiKey）
   */
  async addWithEncryption(dto: {
    apiKey?: string;
    [k: string]: any;
  }): Promise<Record<string, any>> {
    const { apiKey, ...rest } = dto;
    const data: Record<string, any> = { ...rest };
    // 仅当传入非空 apiKey 时才加密写入，否则该字段留空（未配置密钥）
    if (apiKey) {
      data.apiKeyCipher = encryptSecret(apiKey, this.getEncKey());
    }
    const created = await this.add(data);
    return this.toSafe(created as any);
  }

  /**
   * 更新配置：apiKey 非空才替换密文，空/未传则保留原密钥；返回脱敏结果
   * @param id 主键
   * @param dto 更新数据（含可选明文 apiKey）
   */
  async updateWithEncryption(
    id: number,
    dto: { apiKey?: string; [k: string]: any },
  ): Promise<Record<string, any>> {
    const { apiKey, ...rest } = dto;
    const data: Record<string, any> = { ...rest };
    if (apiKey) {
      data.apiKeyCipher = encryptSecret(apiKey, this.getEncKey());
    }
    const updated = await this.update(id, data);
    return this.toSafe(updated as any);
  }

  /**
   * 揭示已存 API Key 明文（仅供管理端在用户显式点击「查看」时按需调用）。
   * 安全约束：调用方须已通过权限校验；返回明文仅用于当前请求，不落日志、不缓存。
   * @param id 供应商配置 ID
   * @returns 明文 apiKey；配置不存在或未配置密钥时返回 null
   */
  async revealApiKey(id: number): Promise<string | null> {
    const config = await this.prisma.modelProviderConfig.findUnique({
      where: { id },
      select: { apiKeyCipher: true },
    });
    if (!config || !config.apiKeyCipher) {
      return null;
    }
    return decryptSecret(config.apiKeyCipher, this.getEncKey());
  }

  /**
   * 内部解密取用配置（绝不用于 HTTP 响应）
   * @param providerConfigId 供应商配置 ID
   * @param modelId 可选：校验该模型归属于此配置并回填
   * @returns 解密后的连接上下文；配置不存在或未配置密钥时返回 null
   */
  async resolveById(
    providerConfigId: number,
    modelId?: string,
  ): Promise<ResolvedModelContext | null> {
    const config = await this.prisma.modelProviderConfig.findUnique({
      where: { id: providerConfigId },
    });
    if (!config || !config.apiKeyCipher) {
      return null;
    }

    // 若指定 modelId，校验其确属该配置，避免越权取用其他配置的模型；同时取回 maxOutputTokens/supportTools 供回填
    let maxOutputTokens: number | null = null;
    let supportTools = true;
    if (modelId) {
      const model = await this.prisma.modelConfig.findFirst({
        where: { providerConfigId, modelId },
        select: { id: true, maxOutputTokens: true, supportTools: true },
      });
      if (!model) {
        return null;
      }
      maxOutputTokens = model.maxOutputTokens ?? null;
      supportTools = model.supportTools ?? true;
    }

    return {
      provider: config.provider,
      apiEndpoint: config.apiEndpoint,
      apiKey: decryptSecret(config.apiKeyCipher, this.getEncKey()),
      protocolType: config.protocolType,
      apiVersion: config.apiVersion,
      modelId,
      maxOutputTokens,
      supportTools,
    };
  }
}
