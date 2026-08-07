"use client";

// 认证守卫：未登录跳转登录页，加载中显示占位。包裹需要登录的页面内容。
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { redirectToLogin } from "@/lib/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin();
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
