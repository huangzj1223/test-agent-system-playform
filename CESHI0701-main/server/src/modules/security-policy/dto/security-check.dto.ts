import { IsString, IsOptional, IsObject, IsIn, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ACTION_TYPES, RISK_LEVELS } from '../catalog/security-policy.enums';

/**
 * 安全校验上下文入参
 *
 * 统一校验入口 check 的载荷，供 Skills 执行前、工具调用前、记忆写入前调用。
 * 与前端 security-policy/types.ts 的 SecurityCheckContext 对齐。
 */
export class SecurityCheckDto {
  @ApiProperty({ description: '操作类型', enum: ACTION_TYPES })
  @IsString()
  @IsIn(ACTION_TYPES as unknown as string[])
  actionType: string;

  @ApiPropertyOptional({ description: 'CLI 命令文本' })
  @IsOptional()
  @IsString()
  command?: string;

  @ApiPropertyOptional({ description: 'SQL 文本' })
  @IsOptional()
  @IsString()
  sql?: string;

  @ApiPropertyOptional({ description: '文件路径' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({ description: 'API 路径' })
  @IsOptional()
  @IsString()
  apiPath?: string;

  @ApiPropertyOptional({ description: '记忆文件名（如 soul.md）' })
  @IsOptional()
  @IsString()
  memoryFile?: string;

  @ApiPropertyOptional({ description: '显式风险等级', enum: RISK_LEVELS })
  @IsOptional()
  @IsString()
  @IsIn(RISK_LEVELS as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: '关联技能 key' })
  @IsOptional()
  @IsString()
  skillKey?: string;

  @ApiPropertyOptional({ description: '关联工具 key' })
  @IsOptional()
  @IsString()
  toolKey?: string;

  @ApiPropertyOptional({ description: '操作载荷' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/** 审计日志查询入参 */
export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: '操作类型', enum: ACTION_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(ACTION_TYPES as unknown as string[])
  actionType?: string;

  @ApiPropertyOptional({ description: '是否允许（true/false）' })
  @IsOptional()
  @IsBoolean()
  allowed?: boolean;

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
