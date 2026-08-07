import { PrismaClient } from '@prisma/client';
import { SeedService } from '../src/common/seed.service';

/**
 * 开发环境种子脚本入口（pnpm prisma:seed / prisma db seed 调用）
 * 复用 SeedService 的幂等初始化逻辑，避免逻辑重复。
 * 生产环境由应用启动钩子 BootstrapService 调用 SeedService，不走此脚本。
 */
async function main() {
  const prisma = new PrismaClient();
  try {
    // SeedService 仅依赖 PrismaService（结构与 PrismaClient 兼容），手动构造注入
    const seedService = new SeedService(prisma as any);
    await seedService.run();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  process.stderr.write(`种子数据初始化失败: ${e}\n`);
  process.exit(1);
});
