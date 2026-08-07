import { SetMetadata } from '@nestjs/common';

// 权限点 action 元数据 key（标在方法上，配合 controller 的 @CrudController prefix 派生完整权限点）
export const PERMS_ACTION_KEY = 'perms:action';

/**
 * 权限点声明装饰器（主流声明式 RBAC，对齐 RuoYi @PreAuthorize 思路）
 *
 * 标在 controller 方法上，声明该接口的「动作」（如 'list' / 'add' / 'delete'）。
 * 完整权限点 = controller 前缀（去 admin/、斜杠转冒号）+ ':' + action，
 * 例如 prefix='admin/sys/role' + action='delete' → 'sys:role:delete'。
 *
 * 守卫读此元数据做校验、启动时扫描此元数据自动登记权限点，二者共用同一派生规则，
 * 因此权限点与 :id 等路径参数无关，从根本上规避「带 id 的 URL 推导对不上」问题。
 *
 * 未标 @Perms 的 /admin 接口视为「仅需登录、无需权限点」（如 open/comm 类）。
 *
 * @param action 动作标识，CRUD 标准动作沿用方法名风格：list/detail/add/update/update-status/delete/batch-delete
 */
export const Perms = (action: string) => SetMetadata(PERMS_ACTION_KEY, action);

/**
 * 由 controller 前缀与 action 派生完整权限点
 * @param prefix @CrudController/@Controller 的路由前缀（如 'admin/sys/role'）
 * @param action 动作标识（如 'delete'）
 * @returns 权限点字符串（如 'sys:role:delete'）；前缀为空时返回 action 本身
 */
export function derivePerm(prefix: string, action: string): string {
  const cleaned = (prefix || '')
    .replace(/^\/+/, '') // 去开头斜杠
    .replace(/^admin\//, '') // 去 admin/ 体系前缀
    .replace(/\/+$/, '') // 去结尾斜杠
    .replace(/\//g, ':'); // 斜杠转冒号
  return cleaned ? `${cleaned}:${action}` : action;
}
