import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '@/common/prisma.service';
import { TaskRegistry } from './task-registry.service';
import { TaskLogService } from './task-log.service';

/**
 * 定时任务调度器
 *
 * 负责动态注册/启停 CronJob，应用启动时从数据库加载所有启用的任务。
 * 任务类型 taskType: 0=cron 表达式 1=固定间隔(秒)
 * 任务状态 status: 0=停止 1=运行
 */
@Injectable()
export class TaskSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskSchedulerService.name);
  // 正在执行的任务 ID 集合，防止同一任务并发重叠执行
  private readonly runningJobs = new Set<number>();

  constructor(
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
    private taskRegistry: TaskRegistry,
    private taskLogService: TaskLogService,
  ) {}

  /**
   * 应用关闭时停止所有已注册的 CronJob
   */
  onModuleDestroy() {
    const jobs = this.schedulerRegistry.getCronJobs();
    for (const [name, job] of jobs) {
      if (name.startsWith('task_')) {
        job.stop();
      }
    }
  }

  /**
   * 应用启动时加载所有启用的任务
   */
  async onModuleInit() {
    const tasks = await this.prisma.taskInfo.findMany({
      where: { status: 1 },
    });
    for (const task of tasks) {
      try {
        this.addJob(task);
      } catch (error) {
        this.logger.error(
          `任务 ${task.id} 加载失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    this.logger.log(`已加载 ${tasks.length} 个定时任务`);
  }
  /**
   * 生成调度器内部使用的 job 名称
   */
  private jobName(taskId: number): string {
    return `task_${taskId}`;
  }

  /**
   * 启动任务（写库 + 注册 job）
   */
  async start(taskId: number) {
    const task = await this.prisma.taskInfo.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new BadRequestException('任务不存在');
    }
    if (!this.taskRegistry.has(task.service || '')) {
      throw new BadRequestException(`未注册的任务处理器: ${task.service}`);
    }

    this.removeJob(taskId);
    this.addJob(task);
    await this.prisma.taskInfo.update({
      where: { id: taskId },
      data: { status: 1 },
    });
  }

  /**
   * 停止任务（写库 + 移除 job）
   */
  async stop(taskId: number) {
    this.removeJob(taskId);
    await this.prisma.taskInfo.update({
      where: { id: taskId },
      data: { status: 0 },
    });
  }

  /**
   * 立即执行一次任务
   */
  async once(taskId: number) {
    const task = await this.prisma.taskInfo.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new BadRequestException('任务不存在');
    }
    await this.execute(task);
  }
  /**
   * 向调度器注册 CronJob
   * taskType: 0=cron 表达式 1=固定间隔（every 字段，单位秒）
   */
  private addJob(task: any) {
    const name = this.jobName(task.id);

    // 间隔任务转换为 cron 表达式
    let cronTime: string;
    if (task.taskType === 1) {
      const seconds = Number(task.every);
      if (!Number.isInteger(seconds) || seconds < 1) {
        throw new Error('间隔任务的 every 必须为正整数秒');
      }
      cronTime = `*/${seconds} * * * * *`;
    } else {
      if (!task.cron) {
        throw new Error('cron 任务缺少 cron 表达式');
      }
      cronTime = task.cron;
    }

    const job = new CronJob(cronTime, () => {
      void this.execute(task);
    });

    this.schedulerRegistry.addCronJob(name, job as any);
    job.start();
  }

  /**
   * 从调度器移除 CronJob（若存在）
   */
  private removeJob(taskId: number) {
    const name = this.jobName(taskId);
    try {
      if (this.schedulerRegistry.doesExist('cron', name)) {
        this.schedulerRegistry.deleteCronJob(name);
      }
    } catch {
      // job 不存在时忽略
    }
  }

  /**
   * 执行任务处理器并记录日志
   */
  private async execute(task: any) {
    // 并发保护：上次执行未完成则跳过本次
    if (this.runningJobs.has(task.id)) {
      this.logger.warn(`任务 ${task.id} 上次执行尚未完成，跳过本次`);
      return;
    }

    const handler = this.taskRegistry.get(task.service || '');
    if (!handler) {
      await this.taskLogService.record(task.id, 0, `未注册的处理器: ${task.service}`);
      return;
    }

    this.runningJobs.add(task.id);
    try {
      const data = task.data ? this.parseData(task.data) : undefined;
      const result = await handler(data);
      await this.taskLogService.record(task.id, 1, result || '执行成功');
      await this.prisma.taskInfo.update({
        where: { id: task.id },
        data: { lastExecuteTime: new Date() },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`任务 ${task.id} 执行失败: ${msg}`);
      await this.taskLogService.record(task.id, 0, msg);
    } finally {
      this.runningJobs.delete(task.id);
    }
  }

  /**
   * 安全解析任务携带的 data（JSON 字符串）
   */
  private parseData(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
