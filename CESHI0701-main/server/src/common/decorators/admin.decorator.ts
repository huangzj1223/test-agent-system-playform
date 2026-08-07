import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前管理员参数装饰器
 *
 * 从请求对象上取出 AuthGuard 鉴权通过后写入的 request.admin（JWT payload）。
 * 用法：`@Admin() admin` 注入完整管理员信息；`@Admin('userId') userId` 注入指定字段。
 *
 * @param data 可选字段名，传入时仅返回该字段，否则返回整个 admin 对象
 */
export const Admin = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const admin = request.admin;
    // 指定了字段名则取单字段，否则返回完整 admin 对象
    return data ? admin?.[data] : admin;
  },
);
