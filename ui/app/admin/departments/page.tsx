"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BriefcaseBusiness, Building2, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { RequireAuth } from "@/components/auth/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createDepartment,
  createPosition,
  deleteDepartment,
  deletePosition,
  getDepartmentTree,
  listPositions,
  updateDepartment,
  updatePosition,
  type DepartmentInfo,
  type DepartmentPayload,
  type PositionInfo,
  type PositionPayload,
} from "@/lib/api/auth";
import { flattenTree } from "@/lib/rbac-utils";

const emptyDept: DepartmentPayload = { name: "", parent_id: null, dept_type: "", leader: "", phone: "", order_num: 0, status: 1 };
const emptyPosition: PositionPayload = { name: "", description: "", order_num: 0, status: 1 };

function DepartmentsPageInner() {
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [activePosId, setActivePosId] = useState<string | null>(null);
  const [deptForm, setDeptForm] = useState<DepartmentPayload>(emptyDept);
  const [posForm, setPosForm] = useState<PositionPayload>(emptyPosition);
  const [loading, setLoading] = useState(true);

  const flatDepartments = useMemo(() => flattenTree(departments), [departments]);
  const activeDept = useMemo(() => flatDepartments.find((item) => item.id === activeDeptId) ?? null, [flatDepartments, activeDeptId]);
  const activePosition = useMemo(() => positions.find((item) => item.id === activePosId) ?? null, [positions, activePosId]);

  const refresh = async () => {
    const [deptResult, posResult] = await Promise.all([getDepartmentTree(), listPositions()]);
    setDepartments(deptResult.data);
    setPositions(posResult.data);
    if (!activeDeptId && deptResult.data.length > 0) selectDepartment(deptResult.data[0]);
    if (!activePosId && posResult.data.length > 0) selectPosition(posResult.data[0]);
  };

  const selectDepartment = (dept: DepartmentInfo) => {
    setActiveDeptId(dept.id);
    setDeptForm({
      name: dept.name,
      parent_id: dept.parent_id,
      dept_type: dept.dept_type ?? "",
      leader: dept.leader ?? "",
      phone: dept.phone ?? "",
      order_num: dept.order_num,
      status: dept.status,
    });
  };

  const selectPosition = (position: PositionInfo) => {
    setActivePosId(position.id);
    setPosForm({
      name: position.name,
      description: position.description ?? "",
      order_num: position.order_num,
      status: position.status,
    });
  };

  useEffect(() => {
    void refresh()
      .catch((err) => toast.error(err instanceof Error ? err.message : "部门加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const saveDepartment = async () => {
    if (!deptForm.name.trim()) {
      toast.error("部门名称不能为空");
      return;
    }
    if (activeDept) await updateDepartment(activeDept.id, deptForm);
    else await createDepartment(deptForm);
    await refresh();
    toast.success("部门已保存");
  };

  const savePosition = async () => {
    if (!posForm.name.trim()) {
      toast.error("岗位名称不能为空");
      return;
    }
    if (activePosition) await updatePosition(activePosition.id, posForm);
    else await createPosition(posForm);
    await refresh();
    toast.success("岗位已保存");
  };

  const removeDepartment = async () => {
    if (!activeDept || !window.confirm(`确认删除部门 ${activeDept.name}？`)) return;
    await deleteDepartment(activeDept.id);
    setActiveDeptId(null);
    setDeptForm(emptyDept);
    await refresh();
  };

  const removePosition = async () => {
    if (!activePosition || !window.confirm(`确认删除岗位 ${activePosition.name}？`)) return;
    await deletePosition(activePosition.id);
    setActivePosId(null);
    setPosForm(emptyPosition);
    await refresh();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">部门管理</h1>
        <p className="text-sm text-muted-foreground">维护组织树和岗位字典</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4" /> 部门树</CardTitle>
              <Button size="sm" variant="outline" onClick={() => { setActiveDeptId(null); setDeptForm({ ...emptyDept, name: "新部门" }); }}>
                <Plus className="size-4" /> 新建
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
            ) : (
              <div className="space-y-1">
                {flatDepartments.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => selectDepartment(dept)}
                    className={`flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm transition hover:border-emerald-300 hover:bg-emerald-50 ${activeDeptId === dept.id ? "border-emerald-400 bg-emerald-50" : "bg-background"}`}
                    style={{ paddingLeft: `${12 + dept.depth * 20}px` }}
                  >
                    <span className="truncate">{dept.name}</span>
                    <Badge variant={dept.status === 1 ? "default" : "outline"}>{dept.status === 1 ? "启用" : "停用"}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{activeDept ? "编辑部门" : "新建部门"}</CardTitle>
                <div className="flex gap-2">
                  {activeDept && <Button variant="outline" size="sm" onClick={() => void removeDepartment()}><Trash2 className="size-4" /></Button>}
                  <Button size="sm" onClick={() => void saveDepartment()}><Save className="size-4" /> 保存</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={deptForm.name} onChange={(event) => setDeptForm({ ...deptForm, name: event.target.value })} placeholder="部门名称" />
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={deptForm.parent_id ?? ""} onChange={(event) => setDeptForm({ ...deptForm, parent_id: event.target.value || null })}>
                <option value="">无父级</option>
                {flatDepartments.filter((item) => item.id !== activeDeptId).map((dept) => (
                  <option key={dept.id} value={dept.id}>{`${"　".repeat(dept.depth)}${dept.name}`}</option>
                ))}
              </select>
              <Input value={deptForm.dept_type ?? ""} onChange={(event) => setDeptForm({ ...deptForm, dept_type: event.target.value })} placeholder="部门类型" />
              <Input value={deptForm.leader ?? ""} onChange={(event) => setDeptForm({ ...deptForm, leader: event.target.value })} placeholder="负责人" />
              <Input value={deptForm.phone ?? ""} onChange={(event) => setDeptForm({ ...deptForm, phone: event.target.value })} placeholder="联系电话" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" value={deptForm.order_num ?? 0} onChange={(event) => setDeptForm({ ...deptForm, order_num: Number(event.target.value) })} placeholder="排序" />
                <select className="rounded-md border bg-background px-3 text-sm" value={deptForm.status ?? 1} onChange={(event) => setDeptForm({ ...deptForm, status: Number(event.target.value) })}>
                  <option value={1}>启用</option>
                  <option value={0}>停用</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><BriefcaseBusiness className="size-4" /> 岗位</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setActivePosId(null); setPosForm({ ...emptyPosition, name: "新岗位" }); }}>
                  <Plus className="size-4" /> 新建
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid max-h-48 gap-2 overflow-auto">
                {positions.map((position) => (
                  <button key={position.id} type="button" onClick={() => selectPosition(position)} className={`flex h-10 items-center justify-between rounded-md border px-3 text-left text-sm hover:border-emerald-300 hover:bg-emerald-50 ${activePosId === position.id ? "border-emerald-400 bg-emerald-50" : "bg-background"}`}>
                    <span>{position.name}</span>
                    <Badge variant={position.status === 1 ? "default" : "outline"}>{position.status === 1 ? "启用" : "停用"}</Badge>
                  </button>
                ))}
              </div>
              <Input value={posForm.name} onChange={(event) => setPosForm({ ...posForm, name: event.target.value })} placeholder="岗位名称" />
              <Input value={posForm.description ?? ""} onChange={(event) => setPosForm({ ...posForm, description: event.target.value })} placeholder="岗位描述" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" value={posForm.order_num ?? 0} onChange={(event) => setPosForm({ ...posForm, order_num: Number(event.target.value) })} placeholder="排序" />
                <select className="rounded-md border bg-background px-3 text-sm" value={posForm.status ?? 1} onChange={(event) => setPosForm({ ...posForm, status: Number(event.target.value) })}>
                  <option value={1}>启用</option>
                  <option value={0}>停用</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void savePosition()}><Save className="size-4" /> 保存岗位</Button>
                {activePosition && <Button variant="outline" onClick={() => void removePosition()}><Trash2 className="size-4" /> 删除岗位</Button>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  return (
    <RequireAuth>
      <DepartmentsPageInner />
    </RequireAuth>
  );
}
