"use client";

import { LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { MainLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

export default function PersonalSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const displayName = user?.nick_name || user?.name || user?.username || "当前用户";

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <RequireAuth>
      <MainLayout title="个人设置">
        <div className="mx-auto max-w-4xl space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">个人设置</h1>
            <p className="mt-1 text-sm text-muted-foreground">查看当前账号信息与访问角色。</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{displayName}</CardTitle>
                    <CardDescription className="truncate">{user?.username || "-"}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="divide-y">
                <ProfileRow label="用户名" value={user?.username || "-"} />
                <ProfileRow label="姓名" value={user?.name || user?.nick_name || "未设置"} />
                <ProfileRow label="邮箱" value={user?.email || "未设置"} icon={<Mail className="h-4 w-4" />} />
                <ProfileRow label="手机号" value={user?.phone || "未设置"} />
                <ProfileRow label="账号状态" value={user?.status === 1 ? "启用" : "停用"} />
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4" />访问角色
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {user?.roles.length ? (
                    user.roles.map((role) => <Badge key={role.id}>{role.label || role.name}</Badge>)
                  ) : (
                    <span className="text-sm text-muted-foreground">暂无角色</span>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">账号操作</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => void handleLogout()}>
                    <LogOut className="mr-2 h-4 w-4" />退出登录
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}

function ProfileRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="grid min-h-12 grid-cols-[96px_minmax(0,1fr)] items-center gap-3 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-2 font-medium">
        {icon}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}
