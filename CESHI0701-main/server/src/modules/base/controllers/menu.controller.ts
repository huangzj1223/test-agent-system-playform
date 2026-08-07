import { Body, Get, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { ApiArrayResult, Perms } from '@/common/decorators';
import { ResultDto } from '@/common/dto/result.dto';
import { MenuService } from '../services/menu.service';
import { MenuVo } from '../vo/base.vo';

/**
 * 系统菜单控制器
 * 提供菜单/权限点的增删改查接口，菜单数据驱动前端路由与按钮级权限。
 * 列表查询支持按名称（name）模糊检索，并可按类型（type）、父级（parentId）精确过滤。
 */
@ApiTags('系统菜单')
@CrudController({
  prefix: 'admin/sys/menu',
  api: ['add', 'delete', 'update', 'info', 'list'],
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    fieldEq: ['type', 'parentId'],
  },
})
export class MenuController extends CrudControllerFactory(MenuVo) {
  constructor(private readonly menuService: MenuService) {
    super(menuService);
  }

  /**
   * 获取菜单树
   * 将扁平菜单列表按父子关系组装为树形结构，供前端渲染导航与权限分配使用。
   */
  @Get('tree')
  @Perms('list')
  @ApiOperation({ summary: '获取菜单树' })
  @ApiArrayResult(MenuVo)
  async tree() {
    const tree = await this.menuService.getTree();
    return this.ok(tree);
  }

  /**
   * 修改菜单显示状态（覆盖基类 update-status）
   * 基类 updateStatus 固定写 status 字段，但 SysMenu 表无 status 列、仅有 isShow，
   * 故在此显式覆盖，将前端传入的 status 映射到 isShow，避免 Prisma 未知字段异常。
   * @param body id=菜单ID，status=是否显示（1 显示 / 0 隐藏）
   */
  @Put('update-status')
  @Perms('update-status')
  @ApiOperation({ summary: '修改菜单显示状态（status 映射到 isShow）' })
  @ApiOkResponse({ type: ResultDto, description: '更新后的记录' })
  async updateStatus(@Body() body: { id: number; status: number }) {
    if (!body.id || typeof body.id !== 'number') return this.fail('id 不能为空');
    if (body.status !== 0 && body.status !== 1) return this.fail('status 仅接受 0 或 1');
    return this.ok(await this.menuService.update(body.id, { isShow: body.status }));
  }
}
