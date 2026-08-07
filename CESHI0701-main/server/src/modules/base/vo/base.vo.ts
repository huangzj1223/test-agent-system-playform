import { ApiProperty } from '@nestjs/swagger';

/**
 * 登录结果 VO
 */
export class LoginResultVo {
  @ApiProperty({ description: '访问 token' })
  token: string;

  @ApiProperty({ description: '刷新 token' })
  refreshToken: string;

  @ApiProperty({ description: '访问 token 过期秒数' })
  expire: number;
}

/**
 * 刷新 token 结果 VO
 */
export class RefreshResultVo {
  @ApiProperty({ description: '新的访问 token' })
  token: string;

  @ApiProperty({ description: '访问 token 过期秒数' })
  expire: number;
}

/**
 * 健康检查结果 VO
 */
export class HealthVo {
  @ApiProperty({ description: '服务状态', example: 'ok' })
  status: string;

  @ApiProperty({ description: '当前时间戳（毫秒）' })
  time: number;
}

/**
 * 系统用户响应 VO
 * 注意：密码（password/passwordV）、socketId 等敏感字段不对外暴露，不在 VO 中。
 */
export class UserVo {
  @ApiProperty({ description: '用户 ID' })
  id: number;

  @ApiProperty({ description: '用户名（登录账号）' })
  username: string;

  @ApiProperty({ description: '工号', nullable: true })
  workId: string | null;

  @ApiProperty({ description: '姓名', nullable: true })
  name: string | null;

  @ApiProperty({ description: '昵称', nullable: true })
  nickName: string | null;

  @ApiProperty({ description: '头像 URL', nullable: true })
  headImg: string | null;

  @ApiProperty({ description: '手机号', nullable: true })
  phone: string | null;

  @ApiProperty({ description: '邮箱', nullable: true })
  email: string | null;

  @ApiProperty({ description: '备注', nullable: true })
  remark: string | null;

  @ApiProperty({ description: '状态 1=启用 0=禁用' })
  status: number;

  @ApiProperty({ description: '所属部门 ID', nullable: true })
  departmentId: number | null;

  @ApiProperty({ description: '岗位 ID', nullable: true })
  positionId: number | null;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;

  @ApiProperty({
    description: '权限点列表（供前端按钮/智能体工具门控；仅个人信息接口返回）',
    type: [String],
    required: false,
  })
  buttons?: string[];
}
/**
 * 系统角色响应 VO
 */
export class RoleVo {
  @ApiProperty({ description: '角色 ID' })
  id: number;

  @ApiProperty({ description: '角色名称' })
  name: string;

  @ApiProperty({ description: '角色标识', nullable: true })
  label: string | null;

  @ApiProperty({ description: '备注', nullable: true })
  remark: string | null;

  @ApiProperty({ description: '数据权限范围标记' })
  relevance: number;

  @ApiProperty({ description: '状态 1=启用 0=禁用' })
  status: number;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

/**
 * 系统菜单响应 VO
 */
export class MenuVo {
  @ApiProperty({ description: '菜单 ID' })
  id: number;

  @ApiProperty({ description: '父级菜单 ID', nullable: true })
  parentId: number | null;

  @ApiProperty({ description: '菜单名称' })
  name: string;

  @ApiProperty({ description: '前端路由路径', nullable: true })
  router: string | null;

  @ApiProperty({ description: '权限标识', nullable: true })
  perms: string | null;

  @ApiProperty({ description: '类型 0=目录 1=菜单 2=按钮' })
  type: number;

  @ApiProperty({ description: '图标', nullable: true })
  icon: string | null;

  @ApiProperty({ description: '排序号' })
  orderNum: number;

  @ApiProperty({ description: '视图组件路径', nullable: true })
  viewPath: string | null;

  @ApiProperty({ description: '是否缓存 1=是 0=否' })
  keepAlive: number;

  @ApiProperty({ description: '是否显示 1=是 0=否' })
  isShow: number;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}
/**
 * 系统部门响应 VO
 */
export class DepartmentVo {
  @ApiProperty({ description: '部门 ID' })
  id: number;

  @ApiProperty({ description: '部门名称' })
  name: string;

  @ApiProperty({ description: '父级部门 ID', nullable: true })
  parentId: number | null;

  @ApiProperty({ description: '部门类型', nullable: true })
  type: string | null;

  @ApiProperty({ description: '负责人', nullable: true })
  leader: string | null;

  @ApiProperty({ description: '联系电话', nullable: true })
  phone: string | null;

  @ApiProperty({ description: '排序号' })
  orderNum: number;

  @ApiProperty({ description: '状态 1=启用 0=禁用' })
  status: number;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

/**
 * 系统岗位响应 VO
 */
export class PositionVo {
  @ApiProperty({ description: '岗位 ID' })
  id: number;

  @ApiProperty({ description: '岗位名称' })
  name: string;

  @ApiProperty({ description: '岗位描述', nullable: true })
  description: string | null;

  @ApiProperty({ description: '排序号' })
  orderNum: number;

  @ApiProperty({ description: '状态 1=启用 0=禁用' })
  status: number;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

/**
 * 系统操作日志响应 VO
 */
export class LogVo {
  @ApiProperty({ description: '日志 ID' })
  id: number;

  @ApiProperty({ description: '操作用户 ID', nullable: true })
  userId: number | null;

  @ApiProperty({ description: '操作动作', nullable: true })
  action: string | null;

  @ApiProperty({ description: '请求 IP', nullable: true })
  ip: string | null;

  @ApiProperty({ description: 'IP 归属地', nullable: true })
  ipAddr: string | null;

  @ApiProperty({ description: '请求参数', nullable: true })
  params: string | null;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}


