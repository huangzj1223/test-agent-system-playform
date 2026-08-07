import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 岗位管理服务
 * 提供岗位数据的基础增删改查能力（继承自 BaseService）。
 */
@Injectable()
export class PositionService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'sysPosition');
  }
}
