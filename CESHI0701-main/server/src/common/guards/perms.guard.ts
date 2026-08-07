import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';
import { RedisService } from '../redis.service';
import { PERMS_ACTION_KEY, derivePerm } from '../decorators/perms.decorator';
import { getCrudOptions } from '../crud/crud.decorator';

// 公开接口标记元数据 key（与 @Public 装饰器共用）
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 权限守卫（声明式 RBAC，对齐 RuoYi/Spring Security 模式）
 *
 * 在 AuthGuard 鉴权通过后执行。权限点不再从请求 URL 推导，而是读取方法上 @Perms 声明的
 * action 元数据，结合 controller 前缀派生完整权限点（见 derivePerm），再与用户权限点比对。
 * 因此权限校验与 :id 等路径参数无关，从根本规避「带 id 的 URL 与权限点对不上」问题。
 *
 * 规则：
 * - @Public 标记 → 放行
 * - 未声明 @Perms 的接口 → 视为仅需登录、无需权限点（open/comm 等），放行
 * - 超管（admin）→ 放行所有
 * - 其余 → 派生权限点，命中用户权限列表才放行
 */
@Injectable()
export class PermsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  /**
   * 权限校验主流程
   * @param context 执行上下文
   * @returns 是否放行；无权限时抛出 ForbiddenException
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public 标记的接口直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 读取方法上 @Perms 声明的 action；未声明 = 仅需登录、无需权限点
    const action = this.reflector.get<string>(
      PERMS_ACTION_KEY,
      context.getHandler(),
    );
    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const admin = request.admin;

    // 未鉴权（无 admin 信息）直接拒绝
    if (!admin) return false;

    // 超级管理员拥有全部权限
    if (admin.username === 'admin') return true;

    // 派生完整权限点：controller 前缀（去 admin/、斜杠转冒号）+ action
    const cls = context.getClass();
    const prefix =
      getCrudOptions(cls)?.prefix ??
      Reflect.getMetadata(PATH_METADATA, cls) ??
      '';
    const requiredPerm = derivePerm(prefix, action);

    // 从 Redis 读取该管理员的权限点列表
    const permsStr = await this.redisService.get(`admin:perms:${admin.userId}`);
    if (!permsStr) {
      throw new ForbiddenException('无权限访问~');
    }

    let perms: string[];
    try {
      perms = JSON.parse(permsStr);
    } catch {
      // 缓存数据损坏视为无权限
      throw new ForbiddenException('无权限访问~');
    }

    if (!perms.includes(requiredPerm)) {
      throw new ForbiddenException('无权限访问~');
    }

    return true;
  }
}

