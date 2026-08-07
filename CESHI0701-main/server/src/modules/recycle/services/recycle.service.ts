import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 回收站服务
 * 支持软删除数据的查询、恢复、彻底删除
 */
@Injectable()
export class RecycleService extends BaseService {
  // 允许恢复的实体白名单（防止恢复到任意表）
  private static readonly ALLOWED_ENTITIES = new Set([
    'sysUser',
    'sysRole',
    'sysMenu',
    'sysDepartment',
    'dictType',
    'dictInfo',
    'spaceInfo',
    'taskInfo',
  ]);

  constructor(protected prisma: PrismaService) {
    super(prisma, 'recycleData');
  }

  /**
   * 将数据移入回收站
   * @param entityName 实体名（Prisma model 名）
   * @param entityId 原记录 ID
   * @param data 原记录完整数据
   * @param userId 操作人
   */
  async moveToRecycle(entityName: string, entityId: number, data: Record<string, unknown>, userId?: number) {
    await this.prisma.recycleData.create({
      data: { entityName, entityId, data: data as any, userId },
    });
  }

  /**
   * 从回收站恢复数据到原表
   * @param id 回收站记录 ID
   */
  async restore(id: number) {
    const record = await this.prisma.recycleData.findUnique({ where: { id } });
    if (!record) {
      throw new BadRequestException('回收站记录不存在');
    }

    if (!RecycleService.ALLOWED_ENTITIES.has(record.entityName)) {
      throw new BadRequestException('该数据类型不支持恢复');
    }

    const model = (this.prisma as any)[record.entityName];
    if (!model) {
      throw new BadRequestException('该数据类型不支持恢复');
    }

    const raw = record.data as Record<string, any>;
    // 过滤系统管理字段，避免主键冲突和时间戳污染
    const { id: _id, createTime, updateTime, ...restoreData } = raw;

    // upsert 防止原主键已被占用导致冲突
    await this.prisma.$transaction([
      model.upsert({
        where: { id: record.entityId },
        create: { id: record.entityId, ...restoreData },
        update: restoreData,
      }),
      this.prisma.recycleData.delete({ where: { id } }),
    ]);
  }

  /**
   * 彻底删除回收站记录（不可恢复）
   * @param ids 回收站记录 ID 列表
   */
  async clear(ids: number[]) {
    await this.prisma.recycleData.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
