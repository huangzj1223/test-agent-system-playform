
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "pending" | "completed" | "error" | "interrupted";
}

export interface SubAgent {
  id: string;
  name: string;
  subAgentName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "pending" | "active" | "completed" | "error";
}
// FIXME  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2U2xOMWR3PT06NzRkMDQzMWQ=

export interface FileItem {
  path: string;
  content: string;
}

export interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  updatedAt?: Date;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
// TODO  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2U2xOMWR3PT06NzRkMDQzMWQ=

export interface InterruptData {
  value: any;
  ns?: string[];
  scope?: string;
}

export interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}

export interface ReviewConfig {
  actionName: string;
  allowedDecisions?: string[];
}
// eslint-disable  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2U2xOMWR3PT06NzRkMDQzMWQ=

export interface ToolApprovalInterruptData {
  action_requests: ActionRequest[];
  review_configs?: ReviewConfig[];
}

/**
 * 人工中断配置，指定处理中断时允许的操作。
 */
export interface HumanInterruptConfig {
  allow_ignore: boolean;
  allow_respond: boolean;
  allow_edit: boolean;
  allow_accept: boolean;
}
// NOTE  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2U2xOMWR3PT06NzRkMDQzMWQ=

/**
 * 表示代理流程中的人工中断。
 * 类似于 LangGraph Interrupt 类型，但具有特定的人工交互字段。
 */
export interface HumanInterrupt {
  action_request: ActionRequest;
  config: HumanInterruptConfig;
  description?: string;
}

/**
 * 人工对代理中断的响应。
 * 匹配 LangGraph SDK 恢复中断的格式。
 */
export type HumanResponse =
  | { type: "approve" }
  | { type: "edit"; edited_action: { name: string; args: Record<string, any> } }
  | { type: "reject"; message: string };
