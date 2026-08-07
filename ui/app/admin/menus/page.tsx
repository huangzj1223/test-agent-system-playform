"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Menu as MenuIcon, Plus, Save, Trash2 } from "lucide-react";

import { RequireAuth } from "@/components/auth/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createMenu,
  deleteMenu,
  getMenuTree,
  updateMenu,
  type MenuInfo,
  type MenuPayload,
} from "@/lib/api/auth";
import { flattenTree } from "@/lib/rbac-utils";

const emptyMenu: MenuPayload = {
  parent_id: null,
  name: "",
  router: "",
  perms: "",
  menu_type: 1,
  icon: "",
  order_num: 0,
  view_path: "",
  keep_alive: 1,
  is_show: 1,
};

function MenusPageInner() {
  const [menus, setMenus] = useState<MenuInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuPayload>(emptyMenu);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const flatMenus = useMemo(() => flattenTree(menus), [menus]);
  const activeMenu = useMemo(() => flatMenus.find((item) => item.id === activeId) ?? null, [flatMenus, activeId]);

  const refresh = async () => {
    const result = await getMenuTree();
    setMenus(result.data);
    if (!activeId && result.data.length > 0) selectMenu(result.data[0]);
  };

  const selectMenu = (menu: MenuInfo) => {
    setActiveId(menu.id);
    setForm({
      parent_id: menu.parent_id,
      name: menu.name,
      router: menu.router ?? "",
      perms: menu.perms ?? "",
      menu_type: menu.menu_type,
      icon: menu.icon ?? "",
      order_num: menu.order_num,
      view_path: menu.view_path ?? "",
      keep_alive: menu.keep_alive ?? 1,
      is_show: menu.is_show ?? 1,
    });
  };

  useEffect(() => {
    void refresh()
      .catch((err) => toast.error(err instanceof Error ? err.message : "菜单加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const createNew = (parentId: string | null = null) => {
    setActiveId(null);
    setForm({ ...emptyMenu, parent_id: parentId, name: "新菜单" });
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("菜单名称不能为空");
      return;
    }
    setSaving(true);
    try {
      if (activeMenu) await updateMenu(activeMenu.id, form);
      else await createMenu(form);
      await refresh();
      toast.success("菜单已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!activeMenu || !window.confirm(`确认删除菜单 ${activeMenu.name}？`)) return;
    await deleteMenu(activeMenu.id);
    setActiveId(null);
    setForm(emptyMenu);
    await refresh();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">菜单管理</h1>
          <p className="text-sm text-muted-foreground">维护目录、菜单与按钮权限标识</p>
        </div>
        <Button onClick={() => createNew()}>
          <Plus className="size-4" /> 新建菜单
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MenuIcon className="size-4" /> 菜单树
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
            ) : (
              <div className="space-y-1">
                {flatMenus.map((menu) => (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => selectMenu(menu)}
                    className={`flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm transition hover:border-emerald-300 hover:bg-emerald-50 ${activeId === menu.id ? "border-emerald-400 bg-emerald-50" : "bg-background"}`}
                    style={{ paddingLeft: `${12 + menu.depth * 20}px` }}
                  >
                    <span className="truncate">{menu.name}</span>
                    <Badge variant="outline">{menu.menu_type === 0 ? "目录" : menu.menu_type === 1 ? "菜单" : "按钮"}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{activeMenu ? "编辑菜单" : "新建菜单"}</CardTitle>
              <div className="flex gap-2">
                {activeMenu && <Button variant="outline" size="sm" onClick={() => createNew(activeMenu.id)}><Plus className="size-4" /> 子菜单</Button>}
                {activeMenu && <Button variant="outline" size="sm" onClick={() => void remove()}><Trash2 className="size-4" /> 删除</Button>}
                <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} 保存</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="菜单名称" />
            <select className="rounded-md border bg-background px-3 text-sm" value={form.parent_id ?? ""} onChange={(event) => setForm({ ...form, parent_id: event.target.value || null })}>
              <option value="">无父级</option>
              {flatMenus.filter((item) => item.id !== activeId).map((menu) => (
                <option key={menu.id} value={menu.id}>{`${"　".repeat(menu.depth)}${menu.name}`}</option>
              ))}
            </select>
            <Input value={form.router ?? ""} onChange={(event) => setForm({ ...form, router: event.target.value })} placeholder="路由" />
            <Input value={form.perms ?? ""} onChange={(event) => setForm({ ...form, perms: event.target.value })} placeholder="权限标识" />
            <select className="rounded-md border bg-background px-3 text-sm" value={form.menu_type ?? 1} onChange={(event) => setForm({ ...form, menu_type: Number(event.target.value) })}>
              <option value={0}>目录</option>
              <option value={1}>菜单</option>
              <option value={2}>按钮</option>
            </select>
            <Input value={form.icon ?? ""} onChange={(event) => setForm({ ...form, icon: event.target.value })} placeholder="图标" />
            <Input value={form.view_path ?? ""} onChange={(event) => setForm({ ...form, view_path: event.target.value })} placeholder="组件路径" />
            <Input type="number" value={form.order_num ?? 0} onChange={(event) => setForm({ ...form, order_num: Number(event.target.value) })} placeholder="排序" />
            <select className="rounded-md border bg-background px-3 text-sm" value={form.is_show ?? 1} onChange={(event) => setForm({ ...form, is_show: Number(event.target.value) })}>
              <option value={1}>显示</option>
              <option value={0}>隐藏</option>
            </select>
            <select className="rounded-md border bg-background px-3 text-sm" value={form.keep_alive ?? 1} onChange={(event) => setForm({ ...form, keep_alive: Number(event.target.value) })}>
              <option value={1}>缓存</option>
              <option value={0}>不缓存</option>
            </select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MenusPage() {
  return (
    <RequireAuth>
      <MenusPageInner />
    </RequireAuth>
  );
}
