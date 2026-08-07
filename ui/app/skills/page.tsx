"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, Power, Route } from "lucide-react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/auth/require-auth";
import { MainLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listAgentSkills,
  routeAgentSkill,
  updateAgentSkill,
  type AgentSkillInfo,
} from "@/lib/api/agent-skill";

function SkillsPageInner() {
  const [skills, setSkills] = useState<AgentSkillInfo[]>([]);
  const [prompt, setPrompt] = useState("帮我生成 API 测试");
  const [matched, setMatched] = useState<AgentSkillInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const result = await listAgentSkills();
    setSkills(result.data);
  };

  useEffect(() => {
    void refresh()
      .catch((err) => toast.error(err instanceof Error ? err.message : "技能加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (skill: AgentSkillInfo) => {
    await updateAgentSkill(skill.id, { enabled: !skill.enabled });
    await refresh();
  };

  const route = async () => {
    const result = await routeAgentSkill(prompt);
    setMatched(result.data);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">技能管理</h1>
        <p className="text-sm text-muted-foreground">登记、启停和验证智能体技能路由</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="size-4" /> 意图路由
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input value={prompt} onChange={(event) => setPrompt(event.target.value)} className="max-w-xl" />
          <Button onClick={() => void route()}>路由</Button>
          {matched && <Badge>{matched.label}</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="size-4" /> 技能注册表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {skills.map((skill) => (
                <div key={skill.id} className="rounded-md border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{skill.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{skill.entrypoint}</div>
                    </div>
                    <Button size="icon" variant="outline" onClick={() => void toggle(skill)} aria-label="切换技能状态">
                      <Power className="size-4" />
                    </Button>
                  </div>
                  <p className="mt-3 min-h-12 text-sm text-muted-foreground">{skill.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {skill.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary">{keyword}</Badge>
                    ))}
                  </div>
                  <Badge className="mt-3" variant={skill.enabled ? "default" : "outline"}>
                    {skill.enabled ? "启用" : "停用"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <RequireAuth>
      <MainLayout title="技能管理">
        <SkillsPageInner />
      </MainLayout>
    </RequireAuth>
  );
}
