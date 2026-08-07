import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 定时任务信息服务（CRUD）
 */
@Injectable()
export class TaskInfoService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'taskInfo');
  }
}
