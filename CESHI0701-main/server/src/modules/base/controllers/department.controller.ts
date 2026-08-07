import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { ApiArrayResult, Perms } from '@/common/decorators';
import { DepartmentService } from '../services/department.service';
import { DepartmentVo } from '../vo/base.vo';

/**
 * 系统部门控制器
 * 提供组织部门的增删改查接口，部门作为用户的组织归属维度并支持树形层级管理。
 * 列表查询支持按部门名称（name）模糊检索。
 */
@ApiTags('系统部门')
@CrudController({
  prefix: 'admin/sys/department',
  api: ['add', 'delete', 'update', 'info', 'list'],
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    // 支持前端按启用状态精确筛选（0 禁用 / 1 启用）
    fieldEq: ['status'],
  },
})
export class DepartmentController extends CrudControllerFactory(DepartmentVo) {
  constructor(private readonly departmentService: DepartmentService) {
    super(departmentService);
  }

  /**
   * 获取部门树
   * 将扁平部门列表按上下级关系组装为树形结构，供前端组织架构展示与归属选择使用。
   */
  @Get('tree')
  @Perms('list')
  @ApiOperation({ summary: '获取部门树' })
  @ApiArrayResult(DepartmentVo)
  async tree() {
    const tree = await this.departmentService.getTree();
    return this.ok(tree);
  }
}
