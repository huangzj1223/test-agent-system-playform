import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import { PrismaService } from './prisma.service';
import { SeedService } from './seed.service';
import { PermsSyncService } from './perms-sync.service';

/**
 * 应用启动初始化（对齐 fastapi 的 lifespan 初始化思路）
 *
 * 生产环境：自动迁移数据库 + 幂等初始化种子数据；开发环境用 `pnpm setup` 脚本初始化。
 * 权限点自动同步（PermsSyncService）则在所有环境执行——它依赖代码声明而非环境，
 * 新增接口重启即自动登记权限，是声明式 RBAC 的核心环节。
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly seedService: SeedService,
    private readonly permsSyncService: PermsSyncService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const env = this.config.get<string>('NODE_ENV', 'development');
    if (env === 'production') {
      this.migrate();
      await this.seedIfEmpty();
    } else {
      this.logger.log('非生产环境，跳过迁移与种子初始化（开发请用 pnpm setup）');
    }

    // 功能权限锚点菜单幂等补齐：所有环境执行，须在 syncPerms 之前
    // （弹窗页签类功能无独立菜单，需先建锚点菜单，按钮才能挂上去）
    await this.ensureFeatureMenus();

    // 权限点自动同步：所有环境执行，在 seed 之后（按钮需挂到已存在的菜单下）
    await this.syncPerms();
  }

  /**
   * 幂等补齐弹窗页签类功能的权限锚点菜单（失败不阻断启动）
   */
  private async ensureFeatureMenus(): Promise<void> {
    try {
      await this.seedService.ensureFeatureMenus();
    } catch (e) {
      this.logger.error(`功能权限锚点菜单补齐失败: ${(e as Error).message}`);
    }
  }

  /**
   * 同步声明式权限点到菜单按钮节点（幂等，失败不阻断启动）
   */
  private async syncPerms(): Promise<void> {
    try {
      await this.permsSyncService.sync();
    } catch (e) {
      // 权限同步失败不应导致服务无法启动，记录错误待人工排查
      this.logger.error(`权限点自动同步失败: ${(e as Error).message}`);
    }
  }

  /**
   * 应用数据库迁移（migrate deploy，幂等：已应用的迁移自动跳过）
   * @throws 迁移失败时抛出，阻止应用启动（fail-fast，避免连接未就绪的库对外提供服务）
   */
  private migrate(): void {
    try {
      this.logger.log('执行数据库迁移 prisma migrate deploy...');
      // 直接调本地 CLI，避免 npx 在网络受限容器中的包解析不确定性
      execSync('node node_modules/prisma/build/index.js migrate deploy', {
        stdio: 'inherit',
      });
      this.logger.log('数据库迁移完成');
    } catch (e) {
      this.logger.error(`数据库迁移失败: ${(e as Error).message}`);
      throw e;
    }
  }

  /** 幂等种子数据：检测无用户才初始化（seed 逻辑已编译进 dist，无需 ts-node） */
  private async seedIfEmpty(): Promise<void> {
    const count = await this.prisma.sysUser.count();
    if (count > 0) {
      this.logger.log(`已有 ${count} 个用户，跳过种子数据初始化`);
      return;
    }
    await this.seedService.run();
  }
}
