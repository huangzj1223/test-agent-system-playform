import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma.service';
import { RedisService } from '@/common/redis.service';
import { PermsSyncService } from '@/common/perms-sync.service';

/**
 * 认证授权服务
 * 负责后台用户的登录、token 签发与刷新、登出，以及权限（perms）的缓存维护。
 * token 与权限均以 Redis 缓存，并通过 passwordVersion 实现改密后旧 token 失效。
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private permsSyncService: PermsSyncService,
  ) {}

  /**
   * 用户登录
   * 校验用户名密码（bcrypt 比对），签发 access/refresh token 并写入 Redis，同时预热权限缓存。
   * @param username 用户名
   * @param password 明文密码
   * @returns access token、refresh token 及 access token 过期秒数
   * @throws BadRequestException 用户不存在、已禁用或密码错误
   */
  async login(username: string, password: string) {
    const user = await this.prisma.sysUser.findUnique({
      where: { username },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new BadRequestException('用户名或密码错误');
    }

    if (user.status === 0) {
      throw new BadRequestException('用户已被禁用');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new BadRequestException('用户名或密码错误');
    }

    const roleIds = user.userRoles.map((ur) => ur.roleId);
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      roleIds,
      passwordVersion: user.passwordV,
    };

    // configService.get 运行时返回字符串，必须转为数字。
    // 否则 jsonwebtoken 会把 "7200" 当作 ms 时间串解析为 7.2 秒。
    const accessExpire = Number(this.configService.get<number>('JWT_ACCESS_EXPIRE', 7200));
    const refreshExpire = Number(this.configService.get<number>('JWT_REFRESH_EXPIRE', 1296000));

    const accessToken = this.jwtService.sign(tokenPayload, {
      expiresIn: accessExpire,
    });
    const refreshToken = this.jwtService.sign(
      { ...tokenPayload, isRefresh: true },
      { expiresIn: refreshExpire },
    );
    await this.redis.set(`admin:token:${user.id}`, accessToken, accessExpire);
    await this.redis.set(`admin:refreshToken:${user.id}`, refreshToken, refreshExpire);
    await this.redis.set(`admin:passwordVersion:${user.id}`, String(user.passwordV), refreshExpire);
    await this.cachePerms(user.id, roleIds);

    return {
      token: accessToken,
      refreshToken,
      expire: accessExpire,
    };
  }

  /**
   * 刷新 access token
   * 校验 refresh token 的有效性（签名、isRefresh 标记、Redis 留存、passwordVersion 未变更），
   * 通过后签发新的 access token 并更新缓存。
   * @param refreshToken 客户端持有的 refresh token
   * @returns 新的 access token 及过期秒数
   * @throws BadRequestException token 无效或已失效
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (!payload.isRefresh) {
        throw new BadRequestException('token 无效');
      }

      const cached = await this.redis.get(`admin:refreshToken:${payload.userId}`);
      if (!cached || cached !== refreshToken) {
        throw new BadRequestException('token 已失效');
      }

      const user = await this.prisma.sysUser.findUnique({
        where: { id: payload.userId },
      });
      if (!user || user.passwordV !== payload.passwordVersion) {
        throw new BadRequestException('token 已失效');
      }

      const accessExpire = Number(this.configService.get<number>('JWT_ACCESS_EXPIRE', 7200));
      const newToken = this.jwtService.sign(
        { userId: user.id, username: user.username, roleIds: payload.roleIds, passwordVersion: user.passwordV },
        { expiresIn: accessExpire },
      );

      await this.redis.set(`admin:token:${user.id}`, newToken, accessExpire);

      return { token: newToken, expire: accessExpire };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('token 无效');
    }
  }

  /**
   * 获取用户权限标识列表
   * 优先读取 Redis 缓存，缓存缺失或解析失败时回源数据库并重建缓存。
   * @param userId 用户 ID
   * @returns 权限标识（perms）字符串数组
   */
  async getPerms(userId: number) {
    const permsStr = await this.redis.get(`admin:perms:${userId}`);
    if (permsStr) {
      try {
        return JSON.parse(permsStr);
      } catch {
        // fall through to rebuild
      }
    }

    const user = await this.prisma.sysUser.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });
    if (!user) return [];

    const roleIds = user.userRoles.map((ur) => ur.roleId);
    return this.cachePerms(userId, roleIds);
  }
  /**
   * 获取当前登录用户的资料信息
   * @param userId 用户 ID
   * @returns 用户基础信息，含部门与所属角色（不含密码等敏感字段）
   */
  /**
   * 获取后台用户信息
   * @param userId 用户 ID
   * @param withButtons 是否附带权限点 buttons（仅个人信息接口需要，菜单接口无需，避免多余全表扫描）
   */
  async getAdminInfo(userId: number, withButtons = false) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        nickName: true,
        headImg: true,
        phone: true,
        email: true,
        remark: true,
        status: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        userRoles: { include: { role: { select: { id: true, name: true, label: true } } } },
      },
    });

    if (!user || !withButtons) return user;

    // 权限点（buttons）：前端据此做按钮/智能体工具的权限门控，与后端 perms.guard 保持一致
    // 超管（admin）→ 全部权限点；普通用户 → 其角色关联的权限点
    const buttons = await this.resolveButtons(userId, user.username);
    return { ...user, buttons };
  }

  /**
   * 解析用户的权限点集合（供前端门控）
   * @param userId 用户 ID
   * @param username 用户名（用于判断是否超管）
   * @returns 权限点字符串数组；超管返回全部菜单权限点
   */
  private async resolveButtons(userId: number, username: string): Promise<string[]> {
    if (username === 'admin') {
      // 超管：与 perms.guard「超管放行所有」对齐，返回系统全部已声明的权限点。
      // 用 @Perms 扫描结果而非 sysMenu，以覆盖尚无父菜单、未落库为按钮的权限点（如 coding:generator:*）。
      return [...new Set(this.permsSyncService.getAllDeclaredPerms())];
    }
    return this.getPerms(userId);
  }

  /**
   * 用户登出
   * 清除该用户的 access token、refresh token 及权限缓存，使其立即失效。
   * @param userId 用户 ID
   */
  async logout(userId: number) {
    await this.redis.del(`admin:token:${userId}`);
    await this.redis.del(`admin:refreshToken:${userId}`);
    await this.redis.del(`admin:perms:${userId}`);
  }

  /**
   * 生成密码哈希
   * 使用 bcrypt（cost 12）对明文密码加盐哈希，用于存储与比对。
   * @param password 明文密码
   * @returns 哈希后的密码串
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * 计算并缓存用户权限标识
   * 汇总用户所有角色关联菜单的 perms，去重后写入 Redis 缓存。
   * @param userId 用户 ID
   * @param roleIds 用户拥有的角色 ID 列表
   * @returns 去重后的权限标识数组；无角色时返回空数组
   */
  private async cachePerms(userId: number, roleIds: number[]): Promise<string[]> {
    if (!roleIds.length) return [];

    const roleMenus = await this.prisma.sysRoleMenu.findMany({
      where: { roleId: { in: roleIds } },
      include: { menu: { select: { perms: true } } },
    });

    const perms = roleMenus
      .map((rm) => rm.menu.perms)
      .filter((p): p is string => !!p);

    const uniquePerms = [...new Set(perms)];
    const accessExpire = Number(this.configService.get<number>('JWT_ACCESS_EXPIRE', 7200));
    await this.redis.set(`admin:perms:${userId}`, JSON.stringify(uniquePerms), accessExpire);

    return uniquePerms;
  }
}

