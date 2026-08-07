import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 字典类型服务
 */
@Injectable()
export class DictTypeService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'dictType');
  }
}
