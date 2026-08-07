import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis.service';
import { IS_PUBLIC_KEY } from './perms.guard';

/**
 * 鉴权守卫
 *
 * 校验请求携带的 JWT，并与 Redis 中缓存的 token、密码版本比对，
 * 通过后将 payload 写入 request.admin 供后续守卫与控制器使用。
 * C 端（/app）路由走独立鉴权体系，本期占位放行。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  /**
   * 鉴权主流程
   * @param context 执行上下文
   * @returns 是否放行；token 缺失或失效时抛出 UnauthorizedException
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public 标记的接口跳过鉴权
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // C 端（/app/*）走独立鉴权体系，本期占位放行，由使用框架的项目按需接入。
    // TODO [SECURITY]: 接入 C 端用户 token 校验前，禁止在 /app 前缀下暴露真实业务接口，
    // 否则将裸奔。接入后移除此放行分支。
    if (this.isAppRoute(request)) {
      this.logger.debug(`[/app 占位放行] ${request.url} —— C 端鉴权尚未接入`);
      return true;
    }

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('登录失效~');
    }

    try {
      const payload = this.jwtService.verify(token);

      // 刷新 token 不能用于访问业务接口
      if (payload.isRefresh) {
        throw new UnauthorizedException('登录失效~');
      }

      // 与 Redis 中缓存的 token 比对，确保单点登录/主动注销生效
      const cachedToken = await this.redisService.get(
        `admin:token:${payload.userId}`,
      );
      if (!cachedToken || cachedToken !== token) {
        throw new UnauthorizedException('登录失效~');
      }

      // 密码版本不一致说明已改密，旧 token 立即失效
      const passwordV = await this.redisService.get(
        `admin:passwordVersion:${payload.userId}`,
      );
      if (passwordV && Number(passwordV) !== payload.passwordVersion) {
        throw new UnauthorizedException('登录失效~');
      }

      // 鉴权信息挂到请求对象，供 PermsGuard / @Admin 使用
      request.admin = payload;
      return true;
    } catch (error) {
      // 已是鉴权异常则原样抛出，其余（验签失败、过期等）统一归为登录失效
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('登录失效~');
    }
  }

  /**
   * 判断是否为 C 端路由（/app 开头）
   * 用 request.url（含 globalPrefix 的完整路径），不用 route.path（不含前缀）。
   * Step 1 阶段 globalPrefix='admin' 时此方法恒返回 false，为预期行为。
   */
  private isAppRoute(request: any): boolean {
    const fullPath = (request.url || '').split('?')[0];
    return /^\/app(\/|$)/.test(fullPath);
  }

  /**
   * 从请求头提取 Bearer token
   * @param request 请求对象
   * @returns token 字符串，缺失时返回 null
   */
  private extractToken(request: any): string | null {
    const authorization = request.headers['authorization'] || '';
    if (authorization.startsWith('Bearer ')) {
      return authorization.slice(7);
    }
    return null;
  }
}
