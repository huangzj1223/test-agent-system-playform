// NOTE  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2UlRWcWFRPT06NWIzN2ZiYmY=

/**
 * AI 生成 Web 功能对话框
 * 用于通过 AI 智能体生成 Web 功能和测试
 * 增强版：增加 URL 输入和测试类型选择
 */
"use client";
// FIXME  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2UlRWcWFRPT06NWIzN2ZiYmY=

import * as React from "react";
import { useState } from "react";
import { Sparkles, Loader2, Info, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AIGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (description: string) => void;
}

export function AIGenerateDialog({
  open,
  onOpenChange,
  onGenerate,
}: AIGenerateDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [testType, setTestType] = useState("functional");

  // 重置表单
  const resetForm = () => {
    setDescription("");
    setTargetUrl("");
    setTestType("functional");
  };

  // 处理对话框关闭
  const handleOpenChange = (open: boolean) => {
    if (!open && !submitting) {
      resetForm();
    }
    onOpenChange(open);
  };

  // 处理生成
  const handleGenerate = () => {
    if (!description.trim()) {
      toast.error("请输入功能描述信息");
      return;
    }

    let prompt = `请帮我创建一个Web功能并生成测试：${description.trim()}`;

    // 若有 URL，包含在 prompt 中
    if (targetUrl.trim()) {
      prompt = `请访问目标网站 ${targetUrl.trim()}，${description.trim()}。\n\n请执行完整的测试流程：
1. 首先使用 inspect_web_page 工具打开并分析目标页面
2. 创建对应的 Web 功能（create_web_function）
3. 创建子功能（create_web_sub_function）
4. 生成测试计划并保存
5. 生成测试用例并保存
6. 生成测试脚本并保存
7. 执行测试并验证结果`;
    }

    // 增加测试类型约束
    if (testType === "security") {
      prompt += `\n\n同时请进行安全测试方面的验证。`;
    }
    if (testType === "comprehensive") {
      prompt += `\n\n请不仅进行功能测试，还要关注安全性、性能、边界值和异常场景。`;
    }

    onGenerate(prompt);
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[hsl(var(--chart-1))]" />
            AI 生成 Web 功能测试
          </DialogTitle>
          <DialogDescription>
            描述您想要测试的 Web 功能，AI 将自动生成功能定义、测试计划、测试用例和测试脚本
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 目标 URL */}
          <div className="space-y-2">
            <Label htmlFor="target-url" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              目标网站 URL
            </Label>
            <Input
              id="target-url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com"
              className="font-mono text-sm"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              输入要测试的目标网站地址，AI 将自动打开并进行页面探索
            </p>
          </div>

          {/* 功能描述 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              功能描述 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：用户登录功能，包含用户名密码登录、手机验证码登录、忘记密码等子功能。需要测试登录成功、失败、验证码错误等场景。"
              className="min-h-[120px] resize-none"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              请详细描述要测试的 Web 功能，包括主要功能点、业务场景、测试要求等
            </p>
          </div>

          {/* 测试类型 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              测试类型
            </Label>
            <Select value={testType} onValueChange={setTestType} disabled={submitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="functional">
                  <div className="flex flex-col">
                    <span className="font-medium">功能测试</span>
                    <span className="text-xs text-muted-foreground">UI 交互 + 功能验证</span>
                  </div>
                </SelectItem>
                <SelectItem value="security">
                  <div className="flex flex-col">
                    <span className="font-medium">安全测试</span>
                    <span className="text-xs text-muted-foreground">含 SQL 注入/XSS/越权等安全检查</span>
                  </div>
                </SelectItem>
                <SelectItem value="comprehensive">
                  <div className="flex flex-col">
                    <span className="font-medium">综合测试</span>
                    <span className="text-xs text-muted-foreground">功能 + 安全 + 边界 + 异常全覆盖</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 示例提示 */}
          <div className="rounded-lg border border-muted bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              <Info className="mr-1 inline h-4 w-4" />描述示例：
            </p>
            <p className="text-xs text-muted-foreground">
              产品管理功能，包括产品列表查看、产品搜索、产品添加、产品编辑、产品删除等子功能。
              需要测试权限控制、数据验证、分页显示、搜索过滤等功能。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={submitting || !description.trim()}
            className="bg-gradient-to-r from-[hsl(var(--chart-1))] to-[hsl(var(--chart-4))] hover:from-[hsl(var(--chart-1)/0.9)] hover:to-[hsl(var(--chart-4)/0.9)] text-white border-0"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                开始生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// TODO  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2UlRWcWFRPT06NWIzN2ZiYmY=
