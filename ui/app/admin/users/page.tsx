"use client";

// 用户管理页：列表 + 新建/编辑/删除/重置密码。阶段一 RBAC 端到端演示页。
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireAuth } from "@/components/auth/require-auth";
import { MainLayout } from "@/components/layout";
import { useAuth } from "@/providers/AuthProvider";
import {
  listUsers,
  deleteUser,
  type UserAdminInfo,
} from "@/lib/api/auth";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";

function UsersPageInner() {
  const { user: currentUser, logout } = useAuth();
  const { data, isLoading, mutate } = useSWR("admin/users", () =>
    listUsers({ page_size: 100 })
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserAdminInfo | null>(null);
  const [resetTarget, setResetTarget] = useState<UserAdminInfo | null>(null);

  const users = data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (u: UserAdminInfo) => {
    setEditing(u);
    setFormOpen(true);
  };

  const handleDelete = async (u: UserAdminInfo) => {
    if (!window.confirm(`确认删除用户「${u.username}」？此操作不可撤销。`)) return;
    try {
      await deleteUser(u.id);
      toast.success("已删除");
      void mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">用户管理</h1>
          <p className="text-sm text-muted-foreground">
            当前登录：{currentUser?.username}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreate}>
            <Plus /> 新建用户
          </Button>
          <Button variant="outline" onClick={() => void logout()}>
            退出登录
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              暂无用户
            </div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-12 gap-2 pb-2 text-xs font-medium text-muted-foreground">
                <div className="col-span-3">用户名</div>
                <div className="col-span-3">邮箱</div>
                <div className="col-span-2">角色</div>
                <div className="col-span-2">状态</div>
                <div className="col-span-2 text-right">操作</div>
              </div>
              {users.map((u) => (
                <div
                  key={u.id}
                  className="grid grid-cols-12 items-center gap-2 py-3 text-sm"
                >
                  <div className="col-span-3 flex items-center gap-2 font-medium">
                    {u.username === "admin" && (
                      <ShieldCheck className="size-4 text-emerald-500" />
                    )}
                    {u.username}
                  </div>
                  <div className="col-span-3 truncate text-muted-foreground">
                    {u.email ?? "-"}
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {u.roles.length ? (
                      u.roles.map((r) => (
                        <Badge key={r.id} variant="secondary">
                          {r.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Badge variant={u.status === 1 ? "default" : "outline"}>
                      {u.status === 1 ? "启用" : "禁用"}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setResetTarget(u)}
                    >
                      <KeyRound className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(u)}
                      disabled={u.username === "admin"}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => void mutate()}
      />
      <ResetPasswordDialog
        user={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequireAuth>
      <MainLayout title="用户管理">
        <UsersPageInner />
      </MainLayout>
    </RequireAuth>
  );
}
