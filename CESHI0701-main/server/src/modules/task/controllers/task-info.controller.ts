import { Post, Put, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { ApiResult, ApiOkVoid, Perms } from '@/common/decorators';
import { TaskInfoService } from '../services/task-info.service';
import { TaskSchedulerService } from '../services/task-scheduler.service';
import { TaskRegistry } from '../services/task-registry.service';
import { TaskOpDto, CreateTaskDto, UpdateTaskDto } from '../dto/task.dto';
import { TaskInfoVo } from '../vo/task.vo';

/**
 * 定时任务信息控制器
 *
 * 在 CRUD 基类提供的删除/详情/分页之外，扩展任务的新增、修改，
 * 以及启动、停止、立即执行一次、查询已注册处理器等调度相关操作。
 */
@ApiTags('定时任务')
@CrudController({
  prefix: 'admin/task/info',
  api: ['delete', 'info', 'page'],
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    fieldEq: ['status', 'taskType'],
  },
})
export class TaskInfoController extends CrudControllerFactory(TaskInfoVo) {
  constructor(
    private readonly taskInfoService: TaskInfoService,
    private readonly schedulerService: TaskSchedulerService,
    private readonly taskRegistry: TaskRegistry,
  ) {
    super(taskInfoService);
  }

  /**
   * 新增任务
   * 新建的任务默认置为停止状态（status=0），需手动启动后才会被调度。
   * @param dto 任务创建参数
   */
  @Post('add')
  @Perms('add')
  @ApiOperation({ summary: '新增任务' })
  @ApiResult(TaskInfoVo)
  async add(@Body() dto: CreateTaskDto) {
    return this.ok(await this.taskInfoService.add({ ...dto, status: 0 }));
  }

  /**
   * 修改任务
   * 若任务当前处于运行状态，更新后重启调度以使新配置（cron/间隔等）即时生效。
   * @param dto 任务更新参数（含任务 ID）
   */
  @Put('update')
  @Perms('update')
  @ApiOperation({ summary: '修改任务' })
  @ApiResult(TaskInfoVo)
  async update(@Body() dto: UpdateTaskDto) {
    const { id, ...data } = dto;
    const result = await this.taskInfoService.update(id, data);
    // 任务正在运行时，重启调度以应用新配置
    const task = await this.taskInfoService.info(id);
    if (task && (task as any).status === 1) {
      await this.schedulerService.start(id);
    }
    return this.ok(result);
  }

  /**
   * 启动任务
   * 注册调度 job 并将任务状态置为运行。
   * @param dto 任务操作参数（任务 ID）
   */
  @Post('start')
  @Perms('start')
  @ApiOperation({ summary: '启动任务' })
  @ApiOkVoid()
  async start(@Body() dto: TaskOpDto) {
    await this.schedulerService.start(dto.id);
    return this.ok();
  }

  /**
   * 停止任务
   * 移除调度 job 并将任务状态置为停止。
   * @param dto 任务操作参数（任务 ID）
   */
  @Post('stop')
  @Perms('stop')
  @ApiOperation({ summary: '停止任务' })
  @ApiOkVoid()
  async stop(@Body() dto: TaskOpDto) {
    await this.schedulerService.stop(dto.id);
    return this.ok();
  }

  /**
   * 立即执行一次任务
   * 不影响任务的启停状态，仅触发一次处理器执行。
   * @param dto 任务操作参数（任务 ID）
   */
  @Post('once')
  @Perms('once')
  @ApiOperation({ summary: '立即执行一次' })
  @ApiOkVoid()
  async once(@Body() dto: TaskOpDto) {
    await this.schedulerService.once(dto.id);
    return this.ok();
  }

  /**
   * 获取已注册的任务处理器列表
   * @returns 可供任务绑定的处理器标识集合
   */
  @Get('handlers')
  @Perms('list')
  @ApiOperation({ summary: '获取已注册的任务处理器列表' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: { type: 'array', items: { type: 'string' }, description: '已注册的处理器标识列表' },
      },
    },
  })
  async handlers() {
    return this.ok(this.taskRegistry.list());
  }
}
