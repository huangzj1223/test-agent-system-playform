import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 任务执行日志服务（CRUD）
 */
@Injectable()
export class TaskLogService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'taskLog');
  }

  /**
   * 记录任务执行日志
   * @param taskId 任务 ID
   * @param status 执行状态 0=失败 1=成功
   * @param detail 执行详情
   */
  async record(taskId: number, status: number, detail?: string) {
    await this.prisma.taskLog.create({
      data: { taskId, status, detail },
    });
  }
}
