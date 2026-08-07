// 公共装饰器统一出口：@Public（放行鉴权）、@Admin（注入当前管理员）、@Perms（声明权限点）、@ApiResult 系列（响应文档）
export * from './public.decorator';
export * from './admin.decorator';
export * from './perms.decorator';
export * from './api-result.decorator';
