import type {
  AgentStageStatus,
  DashboardAgentStage,
} from "../api/dashboard";

export function formatMetric(value: number | null, suffix = ""): string {
  if (value === null) return "待接入";
  return `${value.toLocaleString("zh-CN")}${suffix}`;
}

export function formatRelativeTime(value: string | null): string {
  if (!value) return "暂无活动";
  const timestamp = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} 天前`;
}

export const agentStageLabels: Record<AgentStageStatus, string> = {
  running: "运行中",
  attention: "需关注",
  ready: "已就绪",
  idle: "空闲",
  unavailable: "待接入",
};

export function buildAgentStageView(stages: DashboardAgentStage[]) {
  return stages.map((stage, index) => ({
    ...stage,
    order: index + 1,
    status_label: agentStageLabels[stage.status],
    value_label: stage.data_available
      ? `${stage.task_count ?? 0}`
      : "待接入",
  }));
}
