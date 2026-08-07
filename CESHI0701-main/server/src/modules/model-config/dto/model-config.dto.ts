import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 模型配置新增字段的公共校验片段（供 Add/Update DTO 复用）。
 * 用 class 承载以便两个 DTO 通过继承或字段复制共享；此处用独立常量注释说明区间。
 * temperature 0-2、topP 0-1、timeoutSec 1-600、retryCount 0-10。
 */

/** 允许的供应商类型 */
export const PROVIDER_VALUES = [
  'openai',
  'anthropic',
  'deepseek',
  'openrouter',
  'azure-openai',
  'openai-compatible',
] as const;

/** 允许的协议类型 */
export const PROTOCOL_VALUES = [
  'openai-compatible',
  'anthropic',
  'azure-openai',
  'custom',
] as const;

/**
 * 新增供应商配置请求 DTO
 * apiKey 为明文入参，服务端加密后存储；响应绝不回显。
 */
export class AddProviderDto {
  @ApiProperty({ description: '配置名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '供应商类型' })
  @IsString()
  @IsIn(PROVIDER_VALUES as unknown as string[])
  provider: string;

  @ApiProperty({ description: 'API Endpoint（baseURL）' })
  @IsString()
  @MaxLength(500)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  apiEndpoint: string;

  @ApiProperty({ description: 'API Key（明文，加密后存储）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @ApiProperty({ description: '协议类型' })
  @IsString()
  @IsIn(PROTOCOL_VALUES as unknown as string[])
  protocolType: string;

  @ApiProperty({ description: 'API 版本', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  apiVersion?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '排序值', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

/**
 * 更新供应商配置请求 DTO
 * id 必填；apiKey 传空串或不传表示「不修改现有密钥」，传非空表示替换。
 */
export class UpdateProviderDto {
  @ApiProperty({ description: '配置 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '配置名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: '供应商类型', required: false })
  @IsOptional()
  @IsString()
  @IsIn(PROVIDER_VALUES as unknown as string[])
  provider?: string;

  @ApiProperty({ description: 'API Endpoint（baseURL）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  apiEndpoint?: string;

  @ApiProperty({ description: 'API Key（明文；不传或空串表示不修改）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @ApiProperty({ description: '协议类型', required: false })
  @IsOptional()
  @IsString()
  @IsIn(PROTOCOL_VALUES as unknown as string[])
  protocolType?: string;

  @ApiProperty({ description: 'API 版本', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  apiVersion?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '排序值', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

/**
 * 测试连接请求 DTO
 * 传入已存在的配置 ID（用其已存密钥探测）。
 */
export class TestConnectionDto {
  @ApiProperty({ description: '供应商配置 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '用于测试的模型 ID（供应商侧标识）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelId?: string;
}

/**
 * 新增模型请求 DTO
 */
export class AddModelDto {
  @ApiProperty({ description: '所属供应商配置 ID' })
  @IsInt()
  providerConfigId: number;

  @ApiProperty({ description: '模型显示名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '模型 ID（供应商侧标识）' })
  @IsString()
  @MaxLength(100)
  modelId: string;

  @ApiProperty({ description: '上下文窗口 token 数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  contextWindow?: number;

  @ApiProperty({ description: '最大输出长度 token 数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxOutputTokens?: number;

  @ApiProperty({ description: '是否支持文本输入', required: false })
  @IsOptional()
  @IsBoolean()
  supportText?: boolean;

  @ApiProperty({ description: '是否支持图片输入', required: false })
  @IsOptional()
  @IsBoolean()
  supportImageInput?: boolean;

  @ApiProperty({ description: '是否支持图片输出', required: false })
  @IsOptional()
  @IsBoolean()
  supportImageOutput?: boolean;

  @ApiProperty({ description: '是否支持工具调用', required: false })
  @IsOptional()
  @IsBoolean()
  supportTools?: boolean;

  @ApiProperty({ description: '是否支持流式输出', required: false })
  @IsOptional()
  @IsBoolean()
  supportStream?: boolean;

  @ApiProperty({ description: '是否支持代码生成', required: false })
  @IsOptional()
  @IsBoolean()
  supportCode?: boolean;

  @ApiProperty({ description: '是否支持长文本处理', required: false })
  @IsOptional()
  @IsBoolean()
  supportLongText?: boolean;

  @ApiProperty({ description: '模型池分组', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  poolGroup?: string;

  @ApiProperty({ description: '默认采样温度（0-2）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  defaultTemperature?: number;

  @ApiProperty({ description: '默认 Top P（0-1）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultTopP?: number;

  @ApiProperty({ description: '请求超时（秒，1-600）', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  timeoutSec?: number;

  @ApiProperty({ description: '失败重试次数（0-10）', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  retryCount?: number;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '排序值', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

/**
 * 更新模型请求 DTO（id 必填，其余可选）
 */
export class UpdateModelDto {
  @ApiProperty({ description: '模型 ID（主键）' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '模型显示名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: '模型 ID（供应商侧标识）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelId?: string;

  @ApiProperty({ description: '上下文窗口 token 数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  contextWindow?: number;

  @ApiProperty({ description: '最大输出长度 token 数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxOutputTokens?: number;

  @ApiProperty({ description: '是否支持文本输入', required: false })
  @IsOptional()
  @IsBoolean()
  supportText?: boolean;

  @ApiProperty({ description: '是否支持图片输入', required: false })
  @IsOptional()
  @IsBoolean()
  supportImageInput?: boolean;

  @ApiProperty({ description: '是否支持图片输出', required: false })
  @IsOptional()
  @IsBoolean()
  supportImageOutput?: boolean;

  @ApiProperty({ description: '是否支持工具调用', required: false })
  @IsOptional()
  @IsBoolean()
  supportTools?: boolean;

  @ApiProperty({ description: '是否支持流式输出', required: false })
  @IsOptional()
  @IsBoolean()
  supportStream?: boolean;

  @ApiProperty({ description: '是否支持代码生成', required: false })
  @IsOptional()
  @IsBoolean()
  supportCode?: boolean;

  @ApiProperty({ description: '是否支持长文本处理', required: false })
  @IsOptional()
  @IsBoolean()
  supportLongText?: boolean;

  @ApiProperty({ description: '模型池分组', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  poolGroup?: string;

  @ApiProperty({ description: '默认采样温度（0-2）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  defaultTemperature?: number;

  @ApiProperty({ description: '默认 Top P（0-1）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultTopP?: number;

  @ApiProperty({ description: '请求超时（秒，1-600）', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  timeoutSec?: number;

  @ApiProperty({ description: '失败重试次数（0-10）', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  retryCount?: number;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '排序值', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
