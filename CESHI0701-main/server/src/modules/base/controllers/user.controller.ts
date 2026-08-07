import {
  Controller,
  Post,
  Put,
  Body,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CrudController, CrudControllerFactory } from '@/common/crud';
import { ApiResult, ApiOkVoid, Perms } from '@/common/decorators';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { MoveUserDto, AddUserDto, UpdateUserDto } from '../dto/base.dto';
import { UserVo } from '../vo/base.vo';

/**
 * 系统用户控制器
 * 提供系统用户的增删改查、跨部门移动及角色分配接口。
 * 列表查询支持按姓名（name）、账号（username）、手机号（phone）模糊检索，并可按状态（status）、
 * 部门（departmentId）精确过滤；查询结果同时关联返回所属部门、岗位及角色信息。
 * 注：新增/更新接口涉及密码加密与角色关联表写入，故覆盖了 CRUD 默认实现。
 */
@ApiTags('系统用户')
@CrudController({
  prefix: 'admin/sys/user',
  api: ['delete', 'info', 'page'],
  pageQueryOp: {
    keyWordLikeFields: ['name', 'username', 'phone'],
    fieldEq: ['status', 'departmentId'],
    // 用 select 白名单投影，排除 password/passwordV/socketId 等敏感字段（与 UserVo 一致）
    select: {
      id: true,
      username: true,
      workId: true,
      name: true,
      nickName: true,
      headImg: true,
      phone: true,
      email: true,
      remark: true,
      status: true,
      departmentId: true,
      positionId: true,
      createTime: true,
      updateTime: true,
      department: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
      userRoles: { select: { role: { select: { id: true, name: true, label: true } } } },
    },
  },
})
export class UserController extends CrudControllerFactory(UserVo) {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {
    super(userService);
  }

  /**
   * 新增用户
   * 创建用户主记录，密码经哈希后存储；若携带 roleIds 则额外写入用户-角色关联。
   */
  @Post('add')
  @Perms('add')
  @ApiOperation({ summary: '新增用户' })
  @ApiResult(UserVo)
  async add(@Body() dto: AddUserDto) {
    // 角色为关联表数据，需从主表字段中拆出；密码不可明文落库，先做哈希
    const { roleIds, password, ...userData } = dto;
    const hashedPassword = await this.authService.hashPassword(password);
    const user = await this.userService.add({
      ...userData,
      password: hashedPassword,
    });
    // 仅当传入了非空角色列表时才建立角色关联
    if (roleIds?.length) {
      await this.userService.setRoles(user.id, roleIds);
    }
    // 响应排除敏感字段（密码哈希、密码版本、socketId），与 UserVo 声明保持一致
    const { password: _pwd, passwordV: _pv, socketId: _sid, ...safeUser } = user as any;
    return this.ok(safeUser);
  }

  /**
   * 更新用户
   * 更新用户主表字段，并按需同步角色关联（在同一事务内处理以保证一致性）。
   */
  @Put('update')
  @Perms('update')
  @ApiOperation({ summary: '更新用户' })
  @ApiOkVoid()
  async update(@Body() dto: UpdateUserDto) {
    // roleIds 是关联表数据，需与用户主表在同一事务内分开处理
    // roleIds: undefined=不修改角色；[]=清空所有角色；[...]=替换为指定角色
    const { id, roleIds, ...userData } = dto;
    await this.userService.updateWithRoles(id, userData, roleIds);
    return this.ok();
  }

  /**
   * 删除用户
   * 删除前校验：超级管理员（admin）为系统内置账号，禁止删除。
   */
  @Delete('delete/:id')
  @Perms('delete')
  @ApiOperation({ summary: '按 id 删除用户' })
  @ApiOkVoid()
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.userService.ensureNoSuperAdmin([id]);
    return super.delete(id);
  }

  /**
   * 批量删除用户
   * 删除前校验：待删除列表若含超级管理员（admin）则整体拒绝。
   */
  @Post('batch-delete')
  @Perms('batch-delete')
  @ApiOperation({ summary: '批量删除用户' })
  @ApiOkVoid()
  async batchDelete(@Body() body: { ids: number[] }) {
    // 仅对合法的数字 ID 做超管校验，格式非法交由基类统一报错
    if (Array.isArray(body?.ids) && body.ids.length) {
      await this.userService.ensureNoSuperAdmin(
        body.ids.filter((id) => typeof id === 'number'),
      );
    }
    return super.batchDelete(body);
  }

  /**
   * 移动用户到指定部门
   * 变更用户的部门归属，用于组织架构调整。
   */
  @Post('move')
  @Perms('move')
  @ApiOperation({ summary: '移动用户到指定部门' })
  @ApiOkVoid()
  async move(@Body() dto: MoveUserDto) {
    await this.userService.move(dto.userId, dto.departmentId);
    return this.ok();
  }
}
