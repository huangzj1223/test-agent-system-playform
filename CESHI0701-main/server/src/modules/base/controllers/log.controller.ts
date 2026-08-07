import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { Admin } from '@/common/decorators';
import { ApiOkVoid, Perms } from '@/common/decorators';
import { LogService } from '../services/log.service';
import { LogVo } from '../vo/base.vo';

/**
 * 系统日志控制器
 * 提供操作日志的分页查询与清空接口，用于审计与行为追溯。
 * 仅开放分页（page）查询，支持按动作（action）模糊检索，并可按操作人（userId）精确过滤。
 */
@ApiTags('系统日志')
@CrudController({
  prefix: 'admin/sys/log',
  api: ['page'],
  pageQueryOp: {
    keyWordLikeFields: ['action'],
    fieldEq: ['userId'],
  },
})
export class LogController extends CrudControllerFactory(LogVo) {
  constructor(private readonly logService: LogService) {
    super(logService);
  }

  /**
   * 清空日志
   * 不可逆地删除全部操作日志，属高危操作，仅超级管理员（用户名 admin）可执行。
   */
  @Post('clear')
  @Perms('clear')
  @ApiOperation({ summary: '清空日志（仅超级管理员）' })
  @ApiOkVoid()
  async clear(@Admin() admin: any) {
    // 二次校验当前操作人身份，非超级管理员直接拒绝，防止越权清空审计数据
    if (admin.username !== 'admin') {
      return this.fail('无权限操作');
    }
    await this.logService.clear();
    return this.ok();
  }
}
