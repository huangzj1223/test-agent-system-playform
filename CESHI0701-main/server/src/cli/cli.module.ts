import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@/common/prisma.service';
import { IntrospectService } from '@/modules/coding/services/introspect.service';
import { IrBuilderService } from '@/modules/coding/services/ir-builder.service';
import { GeneratorService } from '@/modules/coding/services/generator.service';

/**
 * CLI 专用根模块
 *
 * 仅装配 CLI 代码生成命令所需的最小依赖：数据库访问（PrismaService）与
 * 代码生成三件套（Introspect/IrBuilder/Generator）。
 *
 * 刻意不复用面向 HTTP 服务的 AppModule/CommonModule —— 后者含 BootstrapService
 * （生产环境自动执行 prisma migrate deploy）、PermsSyncService（写库）、
 * ScheduleModule（定时任务调度）等启动副作用，用一次性 CLI 命令引导它们既危险又浪费。
 * 这里只声明纯 @Injectable 服务，createApplicationContext 不会触发上述副作用。
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 与 AppModule 保持一致的 env 加载顺序，确保 DATABASE_URL 可用
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
  ],
  providers: [PrismaService, IrBuilderService, IntrospectService, GeneratorService],
})
export class CliModule {}
