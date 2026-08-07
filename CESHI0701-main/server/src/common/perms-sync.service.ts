import { Injectable, Logger } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PrismaService } from './prisma.service';
import { PERMS_ACTION_KEY, derivePerm } from './decorators/perms.decorator';
import { getCrudOptions } from './crud/crud.decorator';

/** action → 按钮中文名（用于自动登记的菜单按钮节点显示名） */
const ACTION_LABELS: Record<string, string> = {
  list: '查询',
  detail: '详情',
  add: '新增',
  update: '修改',
  'update-status': '改状态',
  delete: '删除',
  'batch-delete': '批量删除',
  move: '移动',
  clear: '清空',
  setMenus: '分配权限',
  getMenus: '读取权限',
  save: '保存',
  approve: '审批',
  toggle: '启停',
  catalog: '能力目录',
  enabled: '启用列表',
  test: '能力测试',
  export: '导出',
  import: '导入',
};

/** 自动发现到的单个权限点 */
interface DiscoveredPerm {
  perm: string; // 完整权限点，如 sys:role:add
  group: string; // 所属分组（去掉末段），如 sys:role
  action: string; // 动作，如 add
}

/**
 * 权限点自动发现服务（对齐 RuoYi/cool 的「权限注册表」思路）
 *
 * 启动时扫描所有 controller 方法上 @Perms 声明的 action，结合 controller 前缀派生完整权限点，
 * 自动登记为 base_sys_menu 的按钮节点（type=2），挂到 perms 前缀匹配的菜单（type=1）下。
 * 新增接口重启即自动登记，无需手动维护权限数据。
 */
@Injectable()
export class PermsSyncService {
  private readonly logger = new Logger(PermsSyncService.name);
  /** 全部已声明权限点缓存：声明在启动后不变，首次计算后 memo，避免每次请求重复反射扫描 */
  private declaredPermsCache: string[] | null = null;

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 扫描所有 controller，收集 @Perms 声明的权限点（去重）
   * @returns 发现的权限点列表
   */
  private collectPerms(): DiscoveredPerm[] {
    const controllers = this.discovery.getControllers();
    const seen = new Set<string>();
    const result: DiscoveredPerm[] = [];

    for (const wrapper of controllers) {
      const instance = wrapper.instance;
      const cls = wrapper.metatype;
      if (!instance || !cls) continue;
      const proto = Object.getPrototypeOf(instance);
      // 前缀：优先 @CrudController 的 prefix，回退 @Controller 的 PATH_METADATA
      const prefix =
        getCrudOptions(cls)?.prefix ??
        Reflect.getMetadata(PATH_METADATA, cls) ??
        '';

      // 遍历原型上的方法（含继承自 CRUD 基类的方法）
      const methodNames = this.scanner.getAllMethodNames(proto);
      for (const name of methodNames) {
        const handler = proto[name];
        const action = Reflect.getMetadata(PERMS_ACTION_KEY, handler);
        if (!action) continue;
        const perm = derivePerm(prefix as string, action);
        if (seen.has(perm)) continue;
        seen.add(perm);
        // 取末段冒号前作为分组；无冒号（无前缀的退化情况）时分组为空，后续按 orphan 处理
        const colonIdx = perm.lastIndexOf(':');
        const group = colonIdx > 0 ? perm.slice(0, colonIdx) : '';
        result.push({ perm, group, action });
      }
    }
    return result;
  }

  /**
   * 获取系统全部已声明的权限点（去重）
   *
   * 与 sysMenu 中已登记的按钮权限不同：这里返回所有 @Perms 声明的权限点，
   * 包含尚无父菜单、未落库为按钮节点的权限点（如 coding:generator:*）。
   * 供超管场景取「完整权限集」用（与 perms.guard「超管放行所有」语义一致）。
   * @returns 权限点字符串数组
   */
  getAllDeclaredPerms(): string[] {
    if (this.declaredPermsCache) return this.declaredPermsCache;
    this.declaredPermsCache = [...new Set(this.collectPerms().map((d) => d.perm))];
    return this.declaredPermsCache;
  }

  /**
   * 同步权限点到菜单按钮节点（幂等）
   *
   * 对每个发现的权限点：找到 perms 前缀（group）匹配的 type=1 菜单作为父节点，
   * 在其下 upsert 一个 type=2 按钮节点（按 perms 唯一）。menu 自身的 list 权限点
   * 已由菜单节点（type=1）承载，不再重复建按钮。
   */
  async sync(): Promise<void> {
    const discovered = this.collectPerms();
    if (!discovered.length) {
      this.logger.warn('未发现任何 @Perms 声明的权限点');
      return;
    }

    // 取所有菜单，建立 group(perms 去末段) → 菜单节点 的索引
    const menus = await this.prisma.sysMenu.findMany();
    const menuByGroup = new Map<string, (typeof menus)[number]>();
    for (const m of menus) {
      if (m.type === 1 && m.perms) {
        menuByGroup.set(m.perms.slice(0, m.perms.lastIndexOf(':')), m);
      }
    }
    // 已存在的按钮权限点集合，用于幂等判断
    const existingPerms = new Set(menus.filter((m) => m.type === 2 && m.perms).map((m) => m.perms!));

    let created = 0;
    const orphans: string[] = [];
    for (const d of discovered) {
      // 菜单节点自身承载的查看权限（list）不再建按钮
      if (d.action === 'list') continue;
      if (existingPerms.has(d.perm)) continue;

      const parent = menuByGroup.get(d.group);
      if (!parent) {
        // 找不到匹配菜单（如该模块尚无 type=1 菜单），记录但不建，避免产生悬空按钮
        orphans.push(d.perm);
        continue;
      }
      await this.prisma.sysMenu.create({
        data: {
          parentId: parent.id,
          name: ACTION_LABELS[d.action] ?? d.action,
          type: 2,
          perms: d.perm,
          orderNum: 0,
        },
      });
      existingPerms.add(d.perm);
      created++;
    }

    this.logger.log(`权限点自动同步完成：发现 ${discovered.length} 个，新增按钮 ${created} 个`);
    if (orphans.length) {
      this.logger.warn(`以下权限点无匹配菜单（未登记，请确认对应菜单已配置）：${orphans.join(', ')}`);
    }
  }
}
