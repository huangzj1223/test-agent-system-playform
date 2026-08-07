import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators';
import { Admin } from '@/common/decorators';
import { ApiResult, ApiArrayResult, ApiOkVoid } from '@/common/decorators';
import { BaseController } from '@/common/crud';
import { AuthService } from '../services/auth.service';
import { MenuService } from '../services/menu.service';
import { LoginDto, RefreshTokenDto } from '../dto/login.dto';
import { LoginResultVo, RefreshResultVo, HealthVo, UserVo } from '../vo/base.vo';

/**
 * 登录认证控制器
 * 提供无需鉴权的开放接口（健康检查、登录、刷新 token）以及登录后的个人信息、权限与菜单查询接口。
 * 标注 @Public 的接口跳过登录鉴权，其余接口需携带有效 token 访问。
 */
@ApiTags('登录认证')
@Controller('admin/open')
export class OpenController extends BaseController {
  constructor(
    private readonly authService: AuthService,
    private readonly menuService: MenuService,
  ) {
    super();
  }

  /**
   * 健康检查
   * 供容器编排/负载均衡探活使用，返回服务状态与当前时间戳，无需鉴权。
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: '健康检查（容器探活）' })
  @ApiResult(HealthVo)
  health() {
    return this.ok({ status: 'ok', time: Date.now() });
  }

  /**
   * 登录
   * 校验用户名与密码，成功后签发访问 token 与刷新 token，无需鉴权。
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: '登录' })
  @ApiResult(LoginResultVo)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.username, dto.password);
    return this.ok(result);
  }

  /**
   * 刷新 token
   * 凭有效的刷新 token 换取新的访问 token，避免用户频繁重新登录，无需鉴权。
   */
  @Public()
  @Post('refreshToken')
  @ApiOperation({ summary: '刷新 token' })
  @ApiResult(RefreshResultVo)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto.refreshToken);
    return this.ok(result);
  }

  /**
   * 退出登录
   * 使当前登录用户的会话/token 失效。
   */
  @Post('logout')
  @ApiOperation({ summary: '退出登录' })
  @ApiOkVoid()
  async logout(@Admin() admin: any) {
    await this.authService.logout(admin.userId);
    return this.ok();
  }

  /**
   * 获取个人信息
   * 返回当前登录用户的基础资料，供前端展示账号信息。
   */
  @Get('person')
  @ApiOperation({ summary: '获取个人信息' })
  @ApiResult(UserVo)
  async person(@Admin() admin: any) {
    // 个人信息接口需附带权限点 buttons，供前端做按钮/智能体工具门控
    const info = await this.authService.getAdminInfo(admin.userId, true);
    return this.ok(info);
  }

  /**
   * 获取权限列表
   * 返回当前登录用户拥有的权限标识集合，供前端做按钮级权限控制。
   */
  @Get('perms')
  @ApiOperation({ summary: '获取权限列表' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: { type: 'array', items: { type: 'string' }, description: '权限标识列表' },
      },
    },
  })
  async perms(@Admin() admin: any) {
    const perms = await this.authService.getPerms(admin.userId);
    return this.ok(perms);
  }

  /**
   * 获取当前用户菜单树（后端菜单模式）
   * 按用户角色返回可见的前端路由树（含目录/菜单及按钮权限 authList），供侧边栏与动态路由注册使用。
   * 超级管理员返回全部菜单。
   */
  @Get('permmenu')
  @ApiOperation({ summary: '获取当前用户菜单树' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: { type: 'array', items: { type: 'object' }, description: '前端路由树（AppRouteRecord 形态）' },
      },
    },
  })
  async permmenu(@Admin() admin: any) {
    const info = await this.authService.getAdminInfo(admin.userId);
    const roleIds = (info?.userRoles ?? []).map((ur: any) => ur.role.id);
    const isSuperAdmin = admin.username === 'admin';
    const menuTree = await this.menuService.getUserMenuTree(roleIds, isSuperAdmin);
    return this.ok(menuTree);
  }
}
