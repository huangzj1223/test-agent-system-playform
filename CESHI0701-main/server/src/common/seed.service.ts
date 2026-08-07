import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

/**
 * 种子数据初始化服务
 *
 * 编译进 dist，生产环境无需 ts-node 即可运行。
 * 幂等：所有写入用 upsert / 存在性检查，可重复执行。
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 执行种子数据初始化（超级管理员 + 默认角色 + 系统菜单） */
  async run(): Promise<void> {
    this.logger.log('开始初始化种子数据...');

    const password = await bcrypt.hash('123456', 12);

    const admin = await this.prisma.sysUser.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password,
        name: '超级管理员',
        nickName: 'Admin',
        status: 1,
        passwordV: 1,
      },
    });

    const adminRole = await this.prisma.sysRole.upsert({
      where: { label: 'admin' },
      update: {},
      create: {
        name: '管理员',
        label: 'admin',
        remark: '系统默认管理员角色',
        relevance: 1,
        status: 1,
      },
    });

    await this.prisma.sysUserRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });

    await this.seedMenus();
    await this.seedPositions();
    // 锚点菜单由 BootstrapService 在所有环境统一幂等补齐，此处不再重复调用

    this.logger.log('种子数据初始化完成，请登录后立即修改默认管理员密码');
  }

  /**
   * 幂等补齐「弹窗页签类」功能的权限锚点菜单（由 BootstrapService 每次启动调用）
   *
   * 智能体技能/安全策略/工具权限等功能挂在「智能体聊天」弹窗页签中，无独立路由页面，
   * 但仍需承载各自的 xxx:list 等权限点，供 PermsSyncService 自动登记按钮、供角色分配权限。
   * 因此建 type=1 锚点菜单并置 isShow=0（不进侧边栏、不注册路由），仅作权限分组锚点。
   *
   * 幂等策略：
   * - 锚点菜单按不可变的 perms 字段判存，管理员改名不影响判存，不会重复建。
   * - 父目录先复用「任一已存在锚点的 parentId」（不依赖可变的目录名），
   *   仅当三个锚点全不存在时才按目录名兜底查找/新建，避免目录被改名后重复建空目录。
   *
   * 部署假设：单进程启动（见 deploy/start-all.sh），故用「查后建」而非 upsert。
   * 若未来改多副本并发启动，需给 SysMenu.perms 加唯一约束并改 upsert 以规避竞态。
   */
  async ensureFeatureMenus(): Promise<void> {
    // 锚点菜单定义：perms 前缀（去 :list 末段）即 PermsSyncService 的分组键
    const anchors = [
      { name: '智能体技能', perms: 'agent-skill:list' },
      { name: '安全策略', perms: 'security-policy:list' },
      { name: '工具权限', perms: 'agent-tool:list' },
      { name: '记忆中心', perms: 'agent-memory:list' },
    ];

    // 先查已存在的锚点：既用于判存，也用于稳定复用父目录（不依赖可变的目录名）
    const anchorPerms = anchors.map((a) => a.perms);
    const existingAnchors = await this.prisma.sysMenu.findMany({
      where: { perms: { in: anchorPerms }, type: 1 },
    });
    const existingByPerms = new Map(existingAnchors.map((m) => [m.perms!, m]));

    // 父目录 ID：优先复用已存在锚点的 parentId；否则按目录名兜底查找；再无则新建
    const DIR_NAME = '智能体管理';
    let dirId = existingAnchors.find((m) => m.parentId != null)?.parentId ?? null;
    if (dirId == null) {
      const dir =
        (await this.prisma.sysMenu.findFirst({ where: { name: DIR_NAME, type: 0 } })) ??
        (await this.prisma.sysMenu.create({
          data: { name: DIR_NAME, type: 0, icon: 'ChatDotRound', orderNum: 90, isShow: 0 },
        }));
      dirId = dir.id;
    }

    let created = 0;
    for (const [idx, a] of anchors.entries()) {
      if (existingByPerms.has(a.perms)) continue;
      await this.prisma.sysMenu.create({
        data: { name: a.name, type: 1, perms: a.perms, parentId: dirId, orderNum: idx + 1, isShow: 0 },
      });
      created++;
    }

    this.logger.log(`功能权限锚点菜单校验完成：新增 ${created} 个（智能体技能/安全策略/工具权限/记忆中心）`);
  }

  /** 初始化系统菜单（type: 0=目录 1=菜单 2=权限按钮）；已存在则跳过 */
  private async seedMenus(): Promise<void> {
    const existing = await this.prisma.sysMenu.count();
    if (existing > 0) {
      this.logger.log('菜单已存在，跳过菜单初始化');
      return;
    }

    // 组织管理
    const orgDir = await this.prisma.sysMenu.create({
      data: { name: '组织管理', type: 0, router: '/organization', icon: 'OfficeBuilding', orderNum: 1 },
    });
    await this.prisma.sysMenu.create({
      data: { name: '部门管理', type: 1, router: '/organization/department', perms: 'sys:department:list', orderNum: 1, parentId: orgDir.id },
    });
    await this.prisma.sysMenu.create({
      data: { name: '人员管理', type: 1, router: '/organization/user', perms: 'sys:user:list', orderNum: 2, parentId: orgDir.id },
    });
    await this.prisma.sysMenu.create({
      data: { name: '岗位管理', type: 1, router: '/organization/position', perms: 'sys:position:list', orderNum: 3, parentId: orgDir.id },
    });

    // 权限管理
    const permDir = await this.prisma.sysMenu.create({
      data: { name: '权限管理', type: 0, router: '/permission', icon: 'Lock', orderNum: 2 },
    });
    // 仅建目录与菜单（type 0/1）；按钮（type 2）由 PermsSyncService 启动时自动登记
    await this.prisma.sysMenu.create({
      data: { name: '角色管理', type: 1, router: '/permission/role', perms: 'sys:role:list', orderNum: 1, parentId: permDir.id },
    });
    await this.prisma.sysMenu.create({
      data: { name: '菜单管理', type: 1, router: '/permission/menu', perms: 'sys:menu:list', orderNum: 2, parentId: permDir.id },
    });

    this.logger.log('系统菜单已初始化（按钮权限由 PermsSyncService 自动登记）');
  }

  /** 初始化默认岗位数据（巡检员/维修工等）；已存在则跳过 */
  private async seedPositions(): Promise<void> {
    const existing = await this.prisma.sysPosition.count();
    if (existing > 0) {
      this.logger.log('岗位已存在，跳过岗位初始化');
      return;
    }

    await this.prisma.sysPosition.createMany({
      data: [
        { name: '巡检员', description: '负责日常设备巡检工作', orderNum: 1 },
        { name: '维修工', description: '负责设备维修保养工作', orderNum: 2 },
        { name: '安全员', description: '负责安全监督检查工作', orderNum: 3 },
        { name: '班组长', description: '负责班组日常管理工作', orderNum: 4 },
        { name: '部门经理', description: '负责部门整体管理工作', orderNum: 5 },
      ],
    });

    this.logger.log('默认岗位已初始化');
  }
}
