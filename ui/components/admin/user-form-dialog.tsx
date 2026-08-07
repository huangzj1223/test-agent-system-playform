"use client";

// 用户新建/编辑对话框：编辑时不改密码；支持选择角色、启用状态。
import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createUser,
  updateUser,
  listRoles,
  type UserAdminInfo,
} from "@/lib/api/auth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: UserAdminInfo | null;
  onSaved: () => void;
}

export function UserFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const { data: rolesData } = useSWR(open ? "admin/roles" : null, () =>
    listRoles({ page_size: 100 })
  );
  const roles = rolesData?.data ?? [];

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(1);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 打开时初始化表单
  useEffect(() => {
    if (!open) return;
    setUsername(editing?.username ?? "");
    setPassword("");
    setEmail(editing?.email ?? "");
    setName(editing?.name ?? "");
    setStatus(editing?.status ?? 1);
    setRoleIds(editing?.roles.map((r) => r.id) ?? []);
  }, [open, editing]);

  const toggleRole = (id: string) => {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!username) return toast.error("请输入用户名");
    if (!editing && !password) return toast.error("请输入初始密码");
    if (!editing && !email) return toast.error("请输入邮箱");
    setSubmitting(true);
    try {
      if (editing) {
        await updateUser(editing.id, {
          email: email || undefined,
          name: name || undefined,
          status,
          role_ids: roleIds,
        });
        toast.success("已更新");
      } else {
        await createUser({
          username,
          password,
          email,
          name: name || undefined,
          status,
          role_ids: roleIds,
        });
        toast.success("已创建");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑用户" : "新建用户"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>用户名</Label>
            <Input
              value={username}
              disabled={!!editing}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="登录账号"
            />
          </div>
          {!editing && (
            <div className="space-y-1.5">
              <Label>初始密码</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>邮箱</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>姓名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>角色</Label>
            <div className="flex flex-wrap gap-3 rounded-md border p-3">
              {roles.length === 0 && (
                <span className="text-sm text-muted-foreground">暂无角色</span>
              )}
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={roleIds.includes(r.id)}
                    onCheckedChange={() => toggleRole(r.id)}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={status === 1}
              onCheckedChange={(v) => setStatus(v ? 1 : 0)}
            />
            启用该用户
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
