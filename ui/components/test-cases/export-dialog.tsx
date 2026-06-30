"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  exportTestCases,
  getExportStatus,
  downloadExport,
  type ExportFormat,
} from "@/lib/api/testCases";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  testCaseIds: string[];
  selectedCount: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  projectId,
  testCaseIds,
  selectedCount,
}: ExportDialogProps) {
  const { t } = useLanguage();
  const [format, setFormat] = React.useState<ExportFormat>("excel");
  const [includeAttachments, setIncludeAttachments] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    if (testCaseIds.length === 0) {
      toast.error(t("testCases.noTestCasesToExport") || "没有可导出的测试用例");
      return;
    }

    try {
      setExporting(true);

      // 启动导出任务
      const response = await exportTestCases(projectId, {
        test_case_ids: testCaseIds,
        format,
        include_attachments: includeAttachments,
        template: "default",
      });

      if (response.success) {
        toast.success(
          t("testCases.exportStarted") || "导出任务已启动，正在处理..."
        );

        // 轮询查询导出状态
        const exportId = response.export_id;
        const checkStatus = async () => {
          try {
            const statusResponse = await getExportStatus(exportId);

            if (statusResponse.status === "completed") {
              toast.success(
                t("testCases.exportSuccess") || "导出完成，开始下载..."
              );
              // 下载文件
              downloadExport(exportId);
              onOpenChange(false);
              setExporting(false);
            } else if (statusResponse.status === "failed") {
              toast.error(
                statusResponse.error_message ||
                  t("testCases.exportFailed") ||
                  "导出失败"
              );
              setExporting(false);
            } else {
              // 继续轮询
              setTimeout(checkStatus, 1000);
            }
          } catch (error) {
            console.error("Failed to check export status:", error);
            toast.error(t("testCases.exportFailed") || "导出失败");
            setExporting(false);
          }
        };

        // 开始轮询
        setTimeout(checkStatus, 1000);
      }
    } catch (error) {
      console.error("Failed to export test cases:", error);
      toast.error(t("testCases.exportFailed") || "导出失败");
      setExporting(false);
    }
  };

  const formatOptions = [
    {
      value: "excel",
      label: "Excel (.xlsx)",
      description: "适合导入测试管理工具",
      icon: FileSpreadsheet,
    },
    {
      value: "word",
      label: "Word (.docx)",
      description: "适合文档归档和打印",
      icon: FileText,
    },
    {
      value: "json",
      label: "JSON",
      description: "适合程序处理和数据交换",
      icon: FileJson,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("testCases.exportTestCases") || "导出测试用例"}
          </DialogTitle>
          <DialogDescription>
            {selectedCount > 0
              ? `已选择 ${selectedCount} 条测试用例`
              : "将导出所有测试用例"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 格式选择 */}
          <div className="space-y-3">
            <Label>{t("testCases.exportFormat") || "导出格式"}</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              {formatOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                  onClick={() => setFormat(option.value as ExportFormat)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <Label
                        htmlFor={option.value}
                        className="font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 导出选项 */}
          <div className="space-y-3">
            <Label>{t("testCases.exportOptions") || "导出选项"}</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-attachments"
                checked={includeAttachments}
                onCheckedChange={(checked) =>
                  setIncludeAttachments(checked as boolean)
                }
                disabled
              />
              <label
                htmlFor="include-attachments"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("testCases.includeAttachments") || "包含附件"}
                <span className="ml-2 text-xs text-muted-foreground">
                  (开发中)
                </span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            {t("common.cancel") || "取消"}
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("testCases.exporting") || "导出中..."}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t("testCases.export") || "导出"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}