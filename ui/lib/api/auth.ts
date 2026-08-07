// 认证与 RBAC 相关 API 封装
import { apiClient } from "./client";

/** 通用成功响应 */
export interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

/** 分页响应 */
export interface ApiPaginated<T> {
  success: boolean;
  info: { page: number; page_size: number; total: number; count?: number };
  data: T[];
}

/** 登录返回的令牌 */
export interface TokenResult {
  token: string;
  refresh_token: string;
  expire: number;
}

/** 角色简要 */
export interface RoleBrief {
  id: string;
  name: string;
  label: string | null;
}

/** 当前用户信息 */
export interface UserInfo {
  id: string;
  username: string;
  name: string | null;
  nick_name: string | null;
  head_img: string | null;
  phone: string | null;
  email: string | null;
  status: number;
  department_id: string | null;
  roles: RoleBrief[];
  buttons: string[];
}

/** 用户管理信息 */
export interface UserAdminInfo {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  nick_name: string | null;
  phone: string | null;
  remark: string | null;
  status: number;
  department_id: string | null;
  position_id: string | null;
  roles: RoleBrief[];
  created_at: string;
  updated_at: string | null;
}

/** 角色信息 */
export interface RoleInfo {
  id: string;
  name: string;
  label: string | null;
  remark: string | null;
  status: number;
  menu_ids: string[];
  created_at: string;
  updated_at: string | null;
}

/** 菜单信息（树形） */
export interface MenuInfo {
  id: string;
  parent_id: string | null;
  name: string;
  router: string | null;
  perms: string | null;
  menu_type: number;
  icon: string | null;
  order_num: number;
  view_path?: string | null;
  keep_alive?: number;
  is_show?: number;
  children: MenuInfo[];
}

export interface DepartmentInfo {
  id: string;
  name: string;
  parent_id: string | null;
  dept_type: string | null;
  leader: string | null;
  phone: string | null;
  order_num: number;
  status: number;
  children: DepartmentInfo[];
}

export interface PositionInfo {
  id: string;
  name: string;
  description: string | null;
  order_num: number;
  status: number;
}

export interface RolePayload {
  name: string;
  label?: string | null;
  remark?: string | null;
  status?: number;
  menu_ids?: string[];
}

export interface MenuPayload {
  parent_id?: string | null;
  name: string;
  router?: string | null;
  perms?: string | null;
  menu_type?: number;
  icon?: string | null;
  order_num?: number;
  view_path?: string | null;
  keep_alive?: number;
  is_show?: number;
}

export interface DepartmentPayload {
  name: string;
  parent_id?: string | null;
  dept_type?: string | null;
  leader?: string | null;
  phone?: string | null;
  order_num?: number;
  status?: number;
}

export interface PositionPayload {
  name: string;
  description?: string | null;
  order_num?: number;
  status?: number;
}

// ==================== 认证 ====================

export function login(username: string, password: string) {
  return apiClient.post<ApiSuccess<TokenResult>>(
    "/auth/login",
    { username, password },
    { skipAuth: true }
  );
}

export function refreshToken(refresh_token: string) {
  return apiClient.post<ApiSuccess<{ token: string; expire: number }>>(
    "/auth/refresh",
    { refresh_token },
    { skipAuth: true }
  );
}

export function logout() {
  return apiClient.post<{ success: boolean; message: string }>("/auth/logout");
}

export function getUserInfo() {
  return apiClient.get<ApiSuccess<UserInfo>>("/auth/userinfo");
}

// ==================== 用户管理 ====================

export function listUsers(params?: { p?: number; page_size?: number }) {
  return apiClient.get<ApiPaginated<UserAdminInfo>>("/users", { params });
}

export function createUser(body: Record<string, unknown>) {
  return apiClient.post<ApiSuccess<UserAdminInfo>>("/users", body);
}

export function updateUser(id: string, body: Record<string, unknown>) {
  return apiClient.put<ApiSuccess<UserAdminInfo>>(`/users/${id}`, body);
}

export function deleteUser(id: string) {
  return apiClient.delete<{ success: boolean; message: string }>(`/users/${id}`);
}

export function resetPassword(id: string, new_password: string) {
  return apiClient.post<{ success: boolean; message: string }>(
    `/users/${id}/reset-password`,
    { new_password }
  );
}

// ==================== 角色 / 菜单 ====================

export function listRoles(params?: { p?: number; page_size?: number }) {
  return apiClient.get<ApiPaginated<RoleInfo>>("/roles", { params });
}

export function createRole(body: RolePayload) {
  return apiClient.post<ApiSuccess<RoleInfo>>("/roles", body);
}

export function updateRole(id: string, body: Partial<RolePayload>) {
  return apiClient.put<ApiSuccess<RoleInfo>>(`/roles/${id}`, body);
}

export function deleteRole(id: string) {
  return apiClient.delete<{ success: boolean; message: string }>(`/roles/${id}`);
}

export function getMenuTree() {
  return apiClient.get<ApiSuccess<MenuInfo[]>>("/menus");
}

export function createMenu(body: MenuPayload) {
  return apiClient.post<ApiSuccess<MenuInfo>>("/menus", body);
}

export function updateMenu(id: string, body: Partial<MenuPayload>) {
  return apiClient.put<ApiSuccess<MenuInfo>>(`/menus/${id}`, body);
}

export function deleteMenu(id: string) {
  return apiClient.delete<{ success: boolean; message: string }>(`/menus/${id}`);
}

export function getDepartmentTree() {
  return apiClient.get<ApiSuccess<DepartmentInfo[]>>("/departments");
}

export function createDepartment(body: DepartmentPayload) {
  return apiClient.post<ApiSuccess<DepartmentInfo>>("/departments", body);
}

export function updateDepartment(id: string, body: Partial<DepartmentPayload>) {
  return apiClient.put<ApiSuccess<DepartmentInfo>>(`/departments/${id}`, body);
}

export function deleteDepartment(id: string) {
  return apiClient.delete<{ success: boolean; message: string }>(`/departments/${id}`);
}

export function listPositions() {
  return apiClient.get<ApiSuccess<PositionInfo[]>>("/positions");
}

export function createPosition(body: PositionPayload) {
  return apiClient.post<ApiSuccess<PositionInfo>>("/positions", body);
}

export function updatePosition(id: string, body: Partial<PositionPayload>) {
  return apiClient.put<ApiSuccess<PositionInfo>>(`/positions/${id}`, body);
}

export function deletePosition(id: string) {
  return apiClient.delete<{ success: boolean; message: string }>(`/positions/${id}`);
}
