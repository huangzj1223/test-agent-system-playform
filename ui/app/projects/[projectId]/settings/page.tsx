"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/auth/require-auth";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProject, updateProject } from "@/lib/api/projects";
import { useProjectContext } from "@/lib/context/project-context";

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectIdentifier = params.projectId as string;
  const { refreshProjects } = useProjectContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getProject(projectIdentifier);
      setName(response.data.name);
      setDescription(response.data.description ?? "");
    } catch (error) {
      console.error(error);
      toast.error("项目设置加载失败");
    } finally {
      setLoading(false);
    }
  }, [projectIdentifier]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const saveProject = async () => {
    if (!name.trim()) {
      toast.error("请输入项目名称");
      return;
    }

    setSaving(true);
    try {
      const response = await updateProject(projectIdentifier, {
        name: name.trim(),
        description: description.trim(),
      });
      setName(response.data.name);
      setDescription(response.data.description ?? "");
      await refreshProjects();
      toast.success("项目设置已保存");
    } catch (error) {
      console.error(error);
      toast.error("项目设置保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireAuth>
      <MainLayout title="项目设置">
        <div className="mx-auto max-w-4xl space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">项目设置</h1>
            <p className="mt-1 text-sm text-muted-foreground">维护当前项目的基础信息。</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">基础信息</CardTitle>
              <CardDescription>项目标识保持不变，名称和描述将同步到项目空间及侧栏。</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex min-h-48 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />加载项目设置
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="project-identifier">项目标识</Label>
                    <Input id="project-identifier" value={projectIdentifier} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-name">项目名称</Label>
                    <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-description">项目描述</Label>
                    <Textarea
                      id="project-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={5}
                      maxLength={2000}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => void saveProject()} disabled={saving || !name.trim()}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      保存
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </RequireAuth>
  );
}
