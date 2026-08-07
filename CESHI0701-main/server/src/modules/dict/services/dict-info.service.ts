import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 字典项服务
 */
@Injectable()
export class DictInfoService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'dictInfo');
  }

  /**
   * 根据字典类型 key 列表批量查询字典项
   * @param keys 字典类型 key 数组
   * @returns 以 key 分组的字典项映射
   */
  async getByKeys(keys: string[]): Promise<Record<string, any[]>> {
    const types = await this.prisma.dictType.findMany({
      where: { key: { in: keys } },
      include: { items: { orderBy: { orderNum: 'asc' } } },
    });

    const result: Record<string, any[]> = {};
    for (const type of types) {
      result[type.key] = type.items;
    }
    return result;
  }
}
