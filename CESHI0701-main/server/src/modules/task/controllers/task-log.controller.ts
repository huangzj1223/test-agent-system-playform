import { ApiTags } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { TaskLogService } from '../services/task-log.service';
import { TaskLogVo } from '../vo/task.vo';

/**
 * 任务日志控制器
 *
 * 基于 CRUD 基类仅开放分页查询（page），支持按 taskId、status 精确过滤，
 * 用于在后台查看各定时任务的执行记录。
 */
@ApiTags('任务日志')
@CrudController({
  prefix: 'admin/task/log',
  api: ['page'],
  pageQueryOp: {
    fieldEq: ['taskId', 'status'],
  },
})
export class TaskLogController extends CrudControllerFactory(TaskLogVo) {
  constructor(private readonly taskLogService: TaskLogService) {
    super(taskLogService);
  }
}
