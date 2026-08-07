import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { BaseService } from '@/common/crud';

/**
 * 系统操作日志服务
 * 负责记录用户操作行为并提供日志清理能力。
 */
@Injectable()
export class LogService extends BaseService {
  constructor(protected prisma: PrismaService) {
    super(prisma, 'sysLog');
  }

  /**
   * 记录一条用户操作日志
   * @param userId 操作人用户 ID
   * @param action 操作描述（如接口路径或动作名）
   * @param ip 操作来源 IP
   * @param params 操作相关参数快照（可选）
   */
  async record(userId: number, action: string, ip: string, params?: string) {
    await this.prisma.sysLog.create({
      data: { userId, action, ip, params },
    });
  }

  /** 清空全部操作日志 */
  async clear() {
    await this.prisma.sysLog.deleteMany({});
  }
}
