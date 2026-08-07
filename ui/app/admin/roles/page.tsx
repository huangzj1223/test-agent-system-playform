"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";

import { RequireAuth } from "@/components/auth/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createRole,
  deleteRole,
  getMenuTree,
  listRoles,
  updateRole,
  type MenuInfo,
  type RoleInfo,
  type RolePayload,
} from "@/lib/api/auth";
import { flattenTree } from "@/lib/rbac-utils";

const emptyRole: RolePayload = {
  name: "",
  label: "",
  remark: "",
  status: 1,
  menu_ids: [],
};

function RolesPageInner() {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [menus, setMenus] = useState<MenuInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<RolePayload>(emptyRole);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const flatMenus = useMemo(() => flattenTree(menus), [menus]);
  const activeRole = useMemo(() => roles.find((item) => item.id === activeId) ?? null, [roles, activeId]);

  const refresh = async () => {
    const [roleResult, menuResult] = await Promise.all([listRoles({ page_size: 200 }), getMenuTree()]);
    setRoles(roleResult.data);
    setMenus(menuResult.data);
    if (!activeId && roleResult.data.length > 0) {
      selectRole(roleResult.data[0]);
    }
  };

  const selectRole = (role: RoleInfo) => {
    setActiveId(role.id);
    setForm({
      name: role.name,
      label: role.label ?? "",
      remark: role.remark ?? "",
      status: role.status,
      menu_ids: role.menu_ids,
    });
  };

  useEffect(() => {
    void refresh()
      .catch((err) => toast.error(err instanceof Error ? err.message : "角色加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const toggleMenu = (menuId: string) => {
    const ids = new Set(form.menu_ids ?? []);
    if (ids.has(menuId)) ids.delete(menuId);
    else ids.add(menuId);
    setForm({ ...form, menu_ids: Array.from(ids) });
  };

  const createNew = () => {
    setActiveId(null);
    setForm({ ...emptyRole, name: "新角色", label: `role_${Date.now()}` });
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("角色名称不能为空");
      return;
    }
    setSaving(true);
    try {
      if (activeRole) await updateRole(activeRole.id, form);
      else await createRole(form);
      await refresh();
      toast.success("角色已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!activeRole || !window.confirm(`确认删除角色 ${activeRole.name}？`)) return;
    await deleteRole(activeRole.id);
    setActiveId(null);
    setForm(emptyRole);
    await refresh();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">角色管理</h1>
          <p className="text-sm text-muted-foreground">维护角色信息并绑定菜单权限</p>
        </div>
        <Button onClick={createNew}>
          <Plus className="size-4" /> 新建角色
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" /> 角色列表
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
            ) : (
              roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectRole(role)}
                  className={`w-full rounded-md border p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 ${activeId === role.id ? "border-emerald-400 bg-emerald-50" : "bg-background"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{role.name}</span>
                    <Badge variant={role.status === 1 ? "default" : "outline"}>{role.status === 1 ? "启用" : "停用"}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{role.label}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{activeRole ? "编辑角色" : "新建角色"}</CardTitle>
              <div className="flex gap-2">
                {activeRole && <Button variant="outline" size="sm" onClick={() => void remove()}><Trash2 className="size-4" /> 删除</Button>}
                <Button size="sm" onClick={() => void save()} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 保存
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="角色名称" />
              <Input value={form.label ?? ""} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="角色标识" />
              <select className="rounded-md border bg-background px-3 text-sm" value={form.status ?? 1} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}>
                <option value={1}>启用</option>
                <option value={0}>停用</option>
              </select>
            </div>
            <Textarea value={form.remark ?? ""} onChange={(event) => setForm({ ...form, remark: event.target.value })} placeholder="备注" />
            <div className="rounded-md border">
              <div className="border-b px-3 py-2 text-sm font-medium">菜单权限</div>
              <div className="grid max-h-[440px] gap-1 overflow-auto p-3 md:grid-cols-2">
                {flatMenus.map((menu) => (
                  <label key={menu.id} className="flex h-9 items-center gap-2 rounded px-2 text-sm hover:bg-muted" style={{ paddingLeft: `${8 + menu.depth * 18}px` }}>
                    <Checkbox checked={(form.menu_ids ?? []).includes(menu.id)} onCheckedChange={() => toggleMenu(menu.id)} />
                    <span className="truncate">{menu.name}</span>
                    {menu.perms && <span className="text-xs text-muted-foreground">{menu.perms}</span>}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RolesPage() {
  return (
    <RequireAuth>
      <RolesPageInner />
    </RequireAuth>
  );
}
