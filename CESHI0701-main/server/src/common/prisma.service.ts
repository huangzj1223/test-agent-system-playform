import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 数据库服务
 *
 * 继承 PrismaClient，作为全应用统一的数据库访问入口。
 * 借助 Nest 生命周期钩子在模块初始化时连接、销毁时断开，确保连接随应用生命周期正确管理。
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /** 模块初始化时建立数据库连接 */
  async onModuleInit() {
    await this.$connect();
  }

  /** 模块销毁时断开数据库连接，释放连接池资源 */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
