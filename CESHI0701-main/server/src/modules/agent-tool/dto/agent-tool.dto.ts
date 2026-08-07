import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsObject,
  MaxLength,
  Matches,
  IsIn,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TOOL_TYPES, TOOL_RISK_LEVELS } from '../catalog/agent-tool.enums';

/** 注册表工具键校验：字母开头，允许字母/数字/点/下划线/连字符（如 ui.openWeb、memory.suggest） */
const REGISTRY_KEY_RULE = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

/** 新建工具入参 */
export class CreateToolDto {
  @ApiProperty({ description: '工具唯一键（命名空间点号/下划线/连字符，如 ui.openWeb）' })
  @IsString()
  @MaxLength(64)
  @Matches(REGISTRY_KEY_RULE, {
    message: '工具键格式非法（须字母开头，仅含字母/数字/点/下划线/连字符）'
  })
  toolKey: string;

  @ApiProperty({ description: '工具名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '工具类型', enum: TOOL_TYPES })
  @IsString()
  @IsIn(TOOL_TYPES as unknown as string[])
  type: string;

  @ApiPropertyOptional({ description: '工具描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '风险等级', enum: TOOL_RISK_LEVELS })
  @IsOptional()
  @IsString()
  @IsIn(TOOL_RISK_LEVELS as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '是否需要人工确认' })
  @IsOptional()
  @IsBoolean()
  requireConfirm?: boolean;

  @ApiPropertyOptional({ description: '适用智能体', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  applicableAgents?: string[];

  @ApiPropertyOptional({ description: '按类型不同的专属配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '排序值' })
  @IsOptional()
  @IsInt()
  sort?: number;
}

/** 更新工具入参 */
export class UpdateToolDto extends CreateToolDto {
  @ApiProperty({ description: '工具主键 ID' })
  @IsInt()
  id: number;
}

/** 切换启用状态入参 */
export class ToggleToolDto {
  @ApiProperty({ description: '工具主键 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '目标启用状态' })
  @IsBoolean()
  enabled: boolean;
}

/** 删除工具入参 */
export class DeleteToolDto {
  @ApiProperty({ description: '工具主键 ID' })
  @IsInt()
  id: number;
}

/** 工具列表查询入参（筛选 + 分页） */
export class ToolListQueryDto {
  @ApiPropertyOptional({ description: '关键词（名称/描述）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: '工具类型', enum: TOOL_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(TOOL_TYPES as unknown as string[])
  type?: string;

  @ApiPropertyOptional({ description: '风险等级', enum: TOOL_RISK_LEVELS })
  @IsOptional()
  @IsString()
  @IsIn(TOOL_RISK_LEVELS as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: '状态：1=启用 0=禁用' })
  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @ApiPropertyOptional({ description: '页码（默认 1）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数（默认 10）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

/** 记录工具调用日志入参 */
export class RecordToolCallDto {
  @ApiProperty({ description: '工具 key' })
  @IsString()
  @MaxLength(64)
  toolKey: string;

  @ApiPropertyOptional({ description: '调用智能体' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  agent?: string;

  @ApiPropertyOptional({ description: '关联 Skill' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  skill?: string;

  @ApiPropertyOptional({ description: '输入参数' })
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

  @ApiProperty({ description: '是否成功' })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: '耗时（毫秒）' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;
}

/** 工具调用日志查询入参 */
export class ToolCallLogQueryDto {
  @ApiProperty({ description: '工具 key' })
  @IsString()
  @MaxLength(64)
  toolKey: string;

  @ApiPropertyOptional({ description: '页码（默认 1）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数（默认 10）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

/** 工具权限校验入参 */
export class ToolCheckDto {
  @ApiProperty({ description: '工具 key' })
  @IsString()
  @MaxLength(64)
  toolKey: string;

  @ApiPropertyOptional({ description: '调用动作（read/write/delete/execute）' })
  @IsOptional()
  @IsString()
  @IsIn(['read', 'write', 'delete', 'execute'])
  action?: string;

  @ApiPropertyOptional({ description: '调用载荷' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/** 注册表单个工具项（前端上报） */
export class RegistryToolItemDto {
  @ApiProperty({ description: '工具唯一键（如 ui.openWeb / memory.suggest）' })
  @IsString()
  @MaxLength(64)
  @Matches(REGISTRY_KEY_RULE, { message: '工具键格式非法（须字母开头，仅含字母/数字/点/下划线/连字符）' })
  toolKey: string;

  @ApiProperty({ description: '工具名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '工具类型', enum: TOOL_TYPES })
  @IsString()
  @IsIn(TOOL_TYPES as unknown as string[])
  type: string;

  @ApiPropertyOptional({ description: '工具描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '风险等级', enum: TOOL_RISK_LEVELS })
  @IsOptional()
  @IsString()
  @IsIn(TOOL_RISK_LEVELS as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: '是否需要人工确认' })
  @IsOptional()
  @IsBoolean()
  requireConfirm?: boolean;
}

/** 同步注册表工具清单入参 */
export class SyncRegistryDto {
  @ApiProperty({ description: '注册表工具清单', type: [RegistryToolItemDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RegistryToolItemDto)
  tools: RegistryToolItemDto[];
}

