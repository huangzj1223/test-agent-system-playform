import { Module } from '@nestjs/common';
import { RecycleController } from './controllers/recycle.controller';
import { RecycleService } from './services/recycle.service';

/**
 * 回收站模块
 *
 * 统一管理软删除数据的回收站能力（查询、恢复、彻底删除），
 * 导出 RecycleService 供各业务模块在删除时调用。
 */
@Module({
  controllers: [RecycleController],
  providers: [RecycleService],
  exports: [RecycleService],
})
export class RecycleModule {}
