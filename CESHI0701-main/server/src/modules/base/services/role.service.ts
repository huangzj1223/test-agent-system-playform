import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 角色管理服务
 * 在基础增删改查之上，维护角色与菜单（权限）的关联关系。
 */
@Injectable()
export class RoleService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'sysRole');
  }

  /**
   * 设置角色的菜单权限（全量覆盖）
   * 在同一事务中先删除该角色原有的菜单关联，再批量写入新的关联，保证权限替换的原子性。
   * @param roleId 角色 ID
   * @param menuIds 该角色最终应拥有的菜单 ID 列表
   */
  async setMenus(roleId: number, menuIds: number[]) {
    await this.prisma.$transaction([
      this.prisma.sysRoleMenu.deleteMany({ where: { roleId } }),
      this.prisma.sysRoleMenu.createMany({
        data: menuIds.map((menuId) => ({ roleId, menuId })),
      }),
    ]);
  }

  /**
   * 获取角色已分配的菜单 ID 列表
   * @param roleId 角色 ID
   * @returns 菜单 ID 数组
   */
  async getMenus(roleId: number): Promise<number[]> {
    const items = await this.prisma.sysRoleMenu.findMany({
      where: { roleId },
      select: { menuId: true },
    });
    return items.map((i) => i.menuId);
  }
}
