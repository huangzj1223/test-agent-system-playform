// 认证 token 的本地存储与读取工具
// 说明：token 存于 localStorage，供 API 客户端注入 Authorization 头。

const TOKEN_KEY = "auth_token";
const REFRESH_KEY = "auth_refresh_token";

/** 读取 access token（仅浏览器环境有效） */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** 读取 refresh token */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

/** 保存双 token */
export function setTokens(token: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

/** 仅更新 access token（刷新场景） */
export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

/** 清除全部 token */
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

/** 跳转到登录页（携带当前路径便于登录后回跳） */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const current = window.location.pathname + window.location.search;
  if (window.location.pathname === "/login") return;
  const next = encodeURIComponent(current);
  window.location.href = `/login?next=${next}`;
}
