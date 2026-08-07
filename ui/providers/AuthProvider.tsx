"use client";

// 全局认证上下文：管理当前用户、登录/登出、权限点判断。
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getUserInfo,
  login as apiLogin,
  logout as apiLogout,
  type UserInfo,
} from "@/lib/api/auth";
import {
  clearTokens,
  getToken,
  setTokens,
} from "@/lib/auth";

interface AuthContextValue {
  user: UserInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPerm: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 拉取当前用户信息
  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getUserInfo();
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await apiLogin(username, password);
      setTokens(res.data.token, res.data.refresh_token);
      const info = await getUserInfo();
      setUser(info.data);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // 忽略登出接口错误，仍清除本地状态
    }
    clearTokens();
    setUser(null);
  }, []);

  // 超管拥有全部权限；否则按 buttons 判断
  const hasPerm = useCallback(
    (perm: string) => {
      if (!user) return false;
      if (user.username === "admin") return true;
      return user.buttons.includes(perm);
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      refresh,
      hasPerm,
    }),
    [user, loading, login, logout, refresh, hasPerm]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 读取认证上下文 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return ctx;
}
