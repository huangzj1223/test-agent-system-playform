import { Controller, Post, Get, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { ApiOkVoid, Perms } from '@/common/decorators';
import { RoleService } from '../services/role.service';
import { SetMenusDto } from '../dto/base.dto';
import { RoleVo } from '../vo/base.vo';

/**
 * 系统角色控制器
 * 提供角色的增删改查接口，并管理角色与菜单权限的关联关系。
 * 列表查询支持按名称（name）、标识（label）模糊检索，并可按状态（status）精确过滤。
 */
@ApiTags('系统角色')
@CrudController({
  prefix: 'admin/sys/role',
  api: ['add', 'delete', 'update', 'info', 'page', 'list'],
  pageQueryOp: {
    keyWordLikeFields: ['name', 'label'],
    fieldEq: ['status'],
  },
})
export class RoleController extends CrudControllerFactory(RoleVo) {
  constructor(private readonly roleService: RoleService) {
    super(roleService);
  }

  /**
   * 设置角色菜单权限
   * 以传入的 menuIds 全量覆盖该角色已有的菜单权限关联。
   */
  @Post('setMenus')
  @Perms('setMenus')
  @ApiOperation({ summary: '设置角色菜单权限' })
  @ApiOkVoid()
  async setMenus(@Body() dto: SetMenusDto) {
    await this.roleService.setMenus(dto.roleId, dto.menuIds);
    return this.ok();
  }

  /**
   * 获取角色菜单权限
   * 返回该角色当前已分配的菜单 id 列表，供前端权限分配界面回显勾选。
   */
  @Get('getMenus/:id')
  @Perms('getMenus')
  @ApiOperation({ summary: '获取角色菜单权限' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'array',
          items: { type: 'number' },
          description: '菜单 ID 列表',
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: '角色 ID', type: Number })
  async getMenus(@Param('id', ParseIntPipe) id: number) {
    const menuIds = await this.roleService.getMenus(id);
    return this.ok(menuIds);
  }
}
