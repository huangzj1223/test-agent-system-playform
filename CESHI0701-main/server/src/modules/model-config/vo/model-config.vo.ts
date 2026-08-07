import { ApiProperty } from '@nestjs/swagger';

/**
 * 供应商配置响应 VO
 *
 * 脱敏关键：不含 apiKeyCipher（密文）与任何形式的明文密钥，
 * 仅以 hasApiKey 布尔标识「是否已配置密钥」，供前端展示配置状态。
 */
export class ProviderConfigVo {
  @ApiProperty({ description: '配置 ID' })
  id: number;

  @ApiProperty({ description: '配置名称' })
  name: string;

  @ApiProperty({ description: '供应商类型' })
  provider: string;

  @ApiProperty({ description: 'API Endpoint（baseURL）' })
  apiEndpoint: string;

  @ApiProperty({ description: '是否已配置 API Key（不返回密钥本身）' })
  hasApiKey: boolean;

  @ApiProperty({ description: '协议类型' })
  protocolType: string;

  @ApiProperty({ description: 'API 版本', nullable: true })
  apiVersion: string | null;

  @ApiProperty({ description: '备注', nullable: true })
  remark: string | null;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({ description: '排序值' })
  sort: number;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

/**
 * 模型响应 VO
 */
export class ModelConfigVo {
  @ApiProperty({ description: '模型 ID（主键）' })
  id: number;

  @ApiProperty({ description: '所属供应商配置 ID' })
  providerConfigId: number;

  @ApiProperty({ description: '模型显示名称' })
  name: string;

  @ApiProperty({ description: '模型 ID（供应商侧标识）' })
  modelId: string;

  @ApiProperty({ description: '上下文窗口 token 数', nullable: true })
  contextWindow: number | null;

  @ApiProperty({ description: '最大输出长度 token 数', nullable: true })
  maxOutputTokens: number | null;

  @ApiProperty({ description: '是否支持文本输入' })
  supportText: boolean;

  @ApiProperty({ description: '是否支持图片输入' })
  supportImageInput: boolean;

  @ApiProperty({ description: '是否支持图片输出' })
  supportImageOutput: boolean;

  @ApiProperty({ description: '是否支持工具调用' })
  supportTools: boolean;

  @ApiProperty({ description: '是否支持流式输出' })
  supportStream: boolean;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({ description: '排序值' })
  sort: number;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}
