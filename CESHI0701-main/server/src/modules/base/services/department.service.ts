import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 部门管理服务
 * 在基础增删改查之上，提供部门树形结构构建能力。
 */
@Injectable()
export class DepartmentService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'sysDepartment');
  }

  /**
   * 获取部门树
   * @param tenantId 租户 ID，传入时只返回该租户的部门（可选）
   * @returns 按 orderNum 升序排列的部门树形数组
   */
  async getTree(tenantId?: number) {
    const departments = await this.prisma.sysDepartment.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { orderNum: 'asc' },
    });
    return this.buildTree(departments, null);
  }

  /**
   * 将扁平部门列表递归组装为树
   * @param items 扁平部门列表
   * @param parentId 当前层级的父节点 ID，根节点传 null
   */
  private buildTree(items: any[], parentId: number | null): any[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }
}
