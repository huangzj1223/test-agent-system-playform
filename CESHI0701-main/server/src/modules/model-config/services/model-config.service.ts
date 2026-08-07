import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 模型服务
 *
 * 管理供应商配置下的模型条目，复用通用 CRUD。
 * 模型本身不含敏感字段，无需额外脱敏。
 */
@Injectable()
export class ModelConfigService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'modelConfig');
  }

  /**
   * 校验同一供应商下模型 ID 是否重复
   * @param providerConfigId 供应商配置 ID
   * @param modelId 供应商侧模型 ID
   * @param excludeId 排除的主键（更新时排除自身）
   * @returns 存在重复返回 true
   */
  async isModelIdDuplicated(
    providerConfigId: number,
    modelId: string,
    excludeId?: number,
  ): Promise<boolean> {
    const existed = await this.prisma.modelConfig.findFirst({
      where: {
        providerConfigId,
        modelId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!existed;
  }
}
