import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * AG-UI RunAgentInput DTO
 *
 * 接收官方 HttpAgent POST 的标准运行入参。字段与 @ag-ui/core 的 RunAgentInput 对齐，
 * 均设为可选以兼容不同客户端版本；messages/tools/context 为不可信外部数据，
 * 仅做浅层结构校验，业务读取时再按需取值。
 */
export class RunAgentInputDto {
  /** 会话线程 ID */
  @IsOptional()
  @IsString()
  threadId?: string;

  /** 运行 ID */
  @IsOptional()
  @IsString()
  runId?: string;

  /** 父运行 ID */
  @IsOptional()
  @IsString()
  parentRunId?: string;

  /** Agent 共享状态 */
  @IsOptional()
  @IsObject()
  state?: Record<string, unknown>;

  /** 消息列表 */
  @IsOptional()
  @IsArray()
  messages?: Array<{ role?: string; content?: string; id?: string }>;

  /** 工具定义列表 */
  @IsOptional()
  @IsArray()
  tools?: unknown[];

  /** 上下文列表 */
  @IsOptional()
  @IsArray()
  context?: unknown[];

  /**
   * 透传属性：原型阶段（方案 B）携带模型连接配置
   * providerConfigId/modelId/apiEndpoint/apiKey/protocolType/agentId。
   * apiKey 仅在内存直连模型时使用，绝不写入日志或响应。
   */
  @IsOptional()
  @IsObject()
  forwardedProps?: Record<string, unknown>;

  /** 中断恢复条目 */
  @IsOptional()
  @IsArray()
  resume?: unknown[];
}
