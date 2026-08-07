"use client";

/**
 * 智能测试任务创建表单
 * 输入目标URL + 测试描述 + 测试类型，触发任务执行
 */

import * as React from "react";
import { useState } from "react";
import {
  Globe,
  Send,
  Loader2,
  Sparkles,
  Info,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TaskCreatorFormData {
  target_url: string;
  description: string;
  test_scope: "functional" | "comprehensive";
}

interface TaskCreatorProps {
  onSubmit: (data: TaskCreatorFormData) => void;
  disabled?: boolean;
}

const EXAMPLE_DESCRIPTIONS = [
  "测试知识库菜单中公共知识库的创建功能",
  "测试用户登录功能，包括正常登录、密码错误、账号不存在等场景",
  "测试商品列表页的搜索、筛选和分页功能",
  "测试购物车的添加、修改数量、删除商品功能",
];

export function SmartTestTaskCreator({ onSubmit, disabled = false }: TaskCreatorProps) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [testScope, setTestScope] = useState<"functional" | "comprehensive">("functional");

  const handleSubmit = () => {
    if (!url.trim() || !description.trim()) return;
    onSubmit({
      target_url: url.trim(),
      description: description.trim(),
      test_scope: testScope,
    });
  };

  const isValid = url.trim() && description.trim() && !disabled;

  return (
    <Card className="border-2 border-[hsl(var(--chart-1)/0.2)] shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[hsl(var(--chart-1))]" />
          <CardTitle className="text-lg">智能测试任务</CardTitle>
        </div>
        <CardDescription>
          输入目标网站和测试需求，AI 自动完成页面探测、用例设计、测试执行和报告生成
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {/* URL 输入 */}
          <div className="space-y-2">
            <Label htmlFor="target-url" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              目标网站 URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="target-url"
              type="url"
              placeholder="http://192.168.193.34:31080/auth/login"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={disabled}
              className="font-mono text-sm"
            />
          </div>

          {/* 测试描述 */}
          <div className="space-y-2">
            <Label htmlFor="test-description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              测试描述 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="test-description"
              placeholder="例如：测试知识库菜单中公共知识库的创建功能，包括创建、编辑、删除等操作..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabled}
              className="min-h-[100px] resize-none"
              rows={4}
            />
          </div>

          {/* 测试范围 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              测试范围
            </Label>
            <Select
              value={testScope}
              onValueChange={(v) => setTestScope(v as "functional" | "comprehensive")}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">
                  <div className="flex flex-col">
                    <span className="font-medium">功能测试</span>
                    <span className="text-xs text-muted-foreground">UI交互 + 功能验证</span>
                  </div>
                </SelectItem>
                <SelectItem value="comprehensive">
                  <div className="flex flex-col">
                    <span className="font-medium">综合测试</span>
                    <span className="text-xs text-muted-foreground">功能 + 安全 + 性能（耗时较长）</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 示例提示 */}
          <div className="rounded-lg border border-muted bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              描述示例（点击可快速填入）:
            </p>
            <div className="flex flex-wrap gap-1">
              {EXAMPLE_DESCRIPTIONS.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled}
                  className="text-xs text-left px-2 py-1 rounded-md bg-background hover:bg-[hsl(var(--chart-1)/0.1)] border border-muted transition-colors cursor-pointer disabled:cursor-not-allowed"
                  onClick={() => setDescription(example)}
                >
                  {example.length > 25 ? example.slice(0, 25) + "..." : example}
                </button>
              ))}
            </div>
          </div>

          {/* 提交按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className={cn(
              "w-full h-11 text-base font-semibold",
              "bg-gradient-to-r from-[hsl(var(--chart-1))] to-[hsl(var(--neon-cyan))]",
              "hover:from-[hsl(var(--chart-1)/0.9)] hover:to-[hsl(var(--neon-cyan)/0.9)]",
              "text-[hsl(var(--card-bg))] border-0 shadow-md hover:shadow-lg transition-all"
            )}
          >
            {disabled ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                任务运行中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                开始智能测试
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
