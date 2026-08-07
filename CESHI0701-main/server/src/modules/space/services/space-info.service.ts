import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 文件信息服务（CRUD + 上传记录）
 */
@Injectable()
export class SpaceInfoService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'spaceInfo');
  }

  /**
   * 保存上传文件的元信息
   * @param fileInfo 文件元信息
   */
  async saveFile(fileInfo: {
    url: string;
    name: string;
    type: string;
    size: number;
    classifyId?: number;
  }) {
    return this.prisma.spaceInfo.create({ data: fileInfo });
  }
}
