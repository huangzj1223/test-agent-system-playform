import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { SeedService } from './seed.service';
import { PermsSyncService } from './perms-sync.service';
import { BootstrapService } from './bootstrap.service';

/**
 * 公共基础模块（全局）
 *
 * 聚合全应用共享的基础设施：Prisma 数据库、Redis 缓存、JWT 签发、
 * 种子数据初始化（SeedService）、权限点自动同步（PermsSyncService）与启动初始化（BootstrapService）。
 * 标记 @Global 后，导出的 PrismaService/RedisService/JwtModule 可在任意模块直接注入，无需重复 import。
 */
@Global()
@Module({
  imports: [
    DiscoveryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET 环境变量未配置，服务无法启动');
        }
        // 启动时校验过期时间为正整数秒，避免运行时 NaN 传入 jwt/redis 导致 token 永不过期
        const accessExpire = Number(config.get('JWT_ACCESS_EXPIRE', 7200));
        if (!Number.isFinite(accessExpire) || accessExpire <= 0) {
          throw new Error('JWT_ACCESS_EXPIRE 配置无效，必须为正整数（秒）');
        }
        return {
          secret,
          signOptions: { expiresIn: `${accessExpire}s` },
        };
      },
    }),
  ],
  providers: [PrismaService, RedisService, SeedService, PermsSyncService, BootstrapService],
  exports: [PrismaService, RedisService, JwtModule, PermsSyncService],
})
export class CommonModule {}
