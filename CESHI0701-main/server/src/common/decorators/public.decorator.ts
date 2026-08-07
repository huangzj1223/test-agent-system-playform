import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/perms.guard';

/**
 * 公开接口装饰器
 *
 * 标记在控制器或方法上，写入 IS_PUBLIC_KEY 元数据。
 * AuthGuard / PermsGuard 读到该标记后直接放行，跳过登录与权限校验。
 * 适用场景：登录、验证码、健康检查等无需鉴权的接口。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
