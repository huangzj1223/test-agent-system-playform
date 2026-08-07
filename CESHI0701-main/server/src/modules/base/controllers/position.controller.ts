import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { PositionService } from '../services/position.service';
import { PositionVo } from '../vo/base.vo';

/**
 * 系统岗位控制器
 * 提供岗位的增删改查接口，岗位作为用户的职务归属维度使用。
 * 通过 CrudController 自动生成 add/delete/update/info/list 五个标准接口，
 * 列表查询支持按岗位名称（name）模糊检索。
 */
@ApiTags('系统岗位')
@CrudController({
  prefix: 'admin/sys/position',
  api: ['add', 'delete', 'update', 'info', 'list'],
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    // 支持前端按启用状态精确筛选（0 禁用 / 1 启用）
    fieldEq: ['status'],
  },
})
export class PositionController extends CrudControllerFactory(PositionVo) {
  constructor(private readonly positionService: PositionService) {
    super(positionService);
  }
}
