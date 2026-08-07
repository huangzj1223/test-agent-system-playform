import { Module } from '@nestjs/common';
import { TaskInfoController } from './controllers/task-info.controller';
import { TaskLogController } from './controllers/task-log.controller';
import { TaskInfoService } from './services/task-info.service';
import { TaskLogService } from './services/task-log.service';
import { TaskRegistry } from './services/task-registry.service';
import { TaskSchedulerService } from './services/task-scheduler.service';

/**
 * 定时任务模块
 *
 * 聚合任务信息/日志的 CRUD 控制器，以及任务注册表与调度器。
 * 对外导出 TaskRegistry（供其它模块注册任务处理器）与 TaskSchedulerService（供启停/立即执行任务）。
 */
@Module({
  controllers: [TaskInfoController, TaskLogController],
  providers: [
    TaskInfoService,
    TaskLogService,
    TaskRegistry,
    TaskSchedulerService,
  ],
  exports: [TaskRegistry, TaskSchedulerService],
})
export class TaskModule {}
