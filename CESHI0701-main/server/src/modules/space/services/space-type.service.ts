import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 文件分类服务（CRUD）
 */
@Injectable()
export class SpaceTypeService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'spaceType');
  }
}
