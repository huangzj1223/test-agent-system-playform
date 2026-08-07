import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/** 前端路由节点（AppRouteRecord 形态，供后端菜单模式直接消费） */
interface RouteNode {
  id: number;
  name: string;
  path: string;
  component: string;
  meta: {
    title: string;
    icon?: string;
    keepAlive: boolean;
    isHide: boolean;
    authList?: { title: string; authMark: string }[];
  };
  children?: RouteNode[];
}

/**
 * 菜单管理服务
 * 在基础增删改查之上，提供菜单树构建（管理用）与用户路由树构建（后端菜单模式用）能力。
 */
@Injectable()
export class MenuService extends BaseService {
  private readonly logger = new Logger(MenuService.name);

  constructor(protected prisma: PrismaService) {
    super(prisma, 'sysMenu');
  }

  /**
   * 获取菜单树
   * @param tenantId 租户 ID，传入时只返回该租户的菜单（可选）
   * @returns 按 orderNum 升序排列的菜单树形数组
   */
  async getTree(tenantId?: number) {
    const menus = await this.prisma.sysMenu.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { orderNum: 'asc' },
    });
    return this.buildTree(menus, null);
  }

  /**
   * 将扁平菜单列表递归组装为树
   * @param items 扁平菜单列表
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

  // PART_USER_MENU

  /**
   * 获取当前用户的前端路由树（后端菜单模式）
   *
   * 超管返回全部菜单；普通用户按角色关联的菜单过滤。
   * 仅 type 0/1（目录/菜单）进路由树，type 2（按钮）的权限标识收进父菜单的 meta.authList。
   *
   * @param roleIds 当前用户的角色 ID 列表
   * @param isSuperAdmin 是否超级管理员
   * @returns AppRouteRecord 形态的路由树
   */
  async getUserMenuTree(roleIds: number[], isSuperAdmin: boolean): Promise<RouteNode[]> {
    // 取菜单集合：超管全部，普通用户按角色关联
    let menus;
    if (isSuperAdmin) {
      menus = await this.prisma.sysMenu.findMany({ orderBy: { orderNum: 'asc' } });
    } else {
      if (!roleIds.length) return [];
      const roleMenus = await this.prisma.sysRoleMenu.findMany({
        where: { roleId: { in: roleIds } },
        select: { menuId: true },
      });
      const menuIds = [...new Set(roleMenus.map((rm) => rm.menuId))];
      if (!menuIds.length) return [];
      menus = await this.prisma.sysMenu.findMany({
        where: { id: { in: menuIds } },
        orderBy: { orderNum: 'asc' },
      });
    }

    // 按 parentId 归集 type 2 按钮，供父菜单挂 authList
    const buttonsByParent = new Map<number, { title: string; authMark: string }[]>();
    for (const m of menus) {
      if (m.type === 2 && m.perms && m.parentId != null) {
        const arr = buttonsByParent.get(m.parentId) ?? [];
        arr.push({ title: m.name, authMark: m.perms });
        buttonsByParent.set(m.parentId, arr);
      }
    }

    // 仅保留目录/菜单（type 0/1）构建路由树
    const routable = menus.filter((m) => m.type === 0 || m.type === 1);
    return this.buildRouteTree(routable, null, buttonsByParent);
  }

  /**
   * 递归将目录/菜单组装为前端路由树，字段由 router 派生
   * @param items 目录/菜单列表（type 0/1）
   * @param parentId 当前层级父节点 ID
   * @param buttonsByParent 按 parentId 归集的按钮权限
   */
  private buildRouteTree(
    items: any[],
    parentId: number | null,
    buttonsByParent: Map<number, { title: string; authMark: string }[]>,
  ): RouteNode[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => {
        const children = this.buildRouteTree(items, item.id, buttonsByParent);
        const authList = buttonsByParent.get(item.id);
        const router: string = item.router || '';
        // 路径：目录(顶级)用完整 router 作根（/organization）；菜单(子级)用末段相对片段（department），
        // 前端 menuDataToRouter 会与父路径拼接还原成完整路径，避免重复拼接。
        const path =
          item.type === 0 ? router : router.split('/').filter(Boolean).pop() || router;
        // 孤立菜单（type1 无父目录）以末段作根路由会与完整 router 不一致，告警便于排查菜单树配置
        if (item.type === 1 && parentId === null) {
          this.logger.warn(
            `孤立菜单 id=${item.id} router=${router} 派生 path=${path}，无父目录，将以末段片段作为根路由，请检查菜单树结构`,
          );
        }
        // 组件：目录套 Layout（/index/index）；菜单用带前导斜杠的完整 router，
        // 前端 loadComponent 拼 ../../views{component}.vue / {component}/index.vue 命中页面。
        const component = item.type === 0 ? '/index/index' : router;
        const node: RouteNode = {
          id: item.id,
          name: this.routerToName(router),
          path,
          component,
          meta: {
            title: item.name,
            icon: item.icon || undefined,
            keepAlive: item.keepAlive === 1,
            isHide: item.isShow === 0,
            ...(authList?.length ? { authList } : {}),
          },
        };
        if (children.length) node.children = children;
        return node;
      });
  }

  /**
   * 由路由路径派生唯一路由名（PascalCase）
   * 如 /organization/department → OrganizationDepartment
   * @param router 路由路径
   */
  private routerToName(router: string | null): string {
    if (!router) return '';
    return router
      .replace(/^\//, '')
      .split('/')
      .filter(Boolean)
      .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
      .join('');
  }
}
