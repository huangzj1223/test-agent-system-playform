import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  IsArray,
  ArrayMaxSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RUN_LOG_TYPES, RUN_LOG_STATUS, RUN_LOG_OWN_TYPES } from '../catalog/agent-run-log.enums';

/**
 * 运行日志 DTO 集合
 *
 * list 为跨 4 源聚合查询的过滤+分页；record 供内部/系统写入 conversation/system/error 三类。
 */

/** 运行日志列表查询（过滤 + 分页，对齐前端 RunLogFilter + 分页） */
export class RunLogListDto {
  @ApiProperty({ description: '日志类型（空=全部）', required: false, enum: RUN_LOG_TYPES })
  @IsOptional()
  @IsIn(RUN_LOG_TYPES as unknown as string[])
  type?: string;

  @ApiProperty({ description: '执行状态（空=全部）', required: false, enum: RUN_LOG_STATUS })
  @IsOptional()
  @IsIn(RUN_LOG_STATUS as unknown as string[])
  status?: string;

  @ApiProperty({ description: '智能体名称（空=全部）', required: false })
  @IsOptional()
  @IsString()
  agent?: string;

  @ApiProperty({ description: '关键词（摘要/技能/工具/会话ID/日志ID/错误信息）', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '开始日期 YYYY-MM-DD（含）', required: false })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({ description: '结束日期 YYYY-MM-DD（含）', required: false })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiProperty({ description: '页码，从 1 开始', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ description: '每页条数', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

/** 运行日志详情查询（按带前缀的统一 id，如 run-12 / skill-3 / tool-5 / mem-8） */
export class RunLogDetailDto {
  @ApiProperty({ description: '统一日志 ID（含来源前缀）' })
  @IsString()
  id!: string;
}

/** 标记错误日志为已处理（仅本表 conversation/system/error 支持） */
export class RunLogMarkProcessedDto {
  @ApiProperty({ description: '统一日志 ID（须为 run- 前缀的本表记录）' })
  @IsString()
  id!: string;
}

/** 导出运行日志（复用列表过滤条件，不分页） */
export class RunLogExportDto {
  @ApiProperty({ description: '日志类型（空=全部）', required: false, enum: RUN_LOG_TYPES })
  @IsOptional()
  @IsIn(RUN_LOG_TYPES as unknown as string[])
  type?: string;

  @ApiProperty({ description: '执行状态（空=全部）', required: false, enum: RUN_LOG_STATUS })
  @IsOptional()
  @IsIn(RUN_LOG_STATUS as unknown as string[])
  status?: string;

  @ApiProperty({ description: '智能体名称（空=全部）', required: false })
  @IsOptional()
  @IsString()
  agent?: string;

  @ApiProperty({ description: '关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '开始日期 YYYY-MM-DD', required: false })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({ description: '结束日期 YYYY-MM-DD', required: false })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

/** 内部写入 conversation/system/error 日志（record） */
export class RunLogRecordDto {
  @ApiProperty({ description: '日志类型', enum: RUN_LOG_OWN_TYPES })
  @IsIn(RUN_LOG_OWN_TYPES as unknown as string[])
  type!: string;

  @ApiProperty({ description: '执行状态', enum: RUN_LOG_STATUS })
  @IsIn(RUN_LOG_STATUS as unknown as string[])
  status!: string;

  @ApiProperty({ description: '内容摘要' })
  @IsString()
  summary!: string;

  @ApiProperty({ description: '会话 ID', required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: '请求 ID', required: false })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiProperty({ description: '智能体名称', required: false })
  @IsOptional()
  @IsString()
  agentName?: string;

  @ApiProperty({ description: '耗时（毫秒）', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMs?: number;

  @ApiProperty({ description: '来源页面', required: false })
  @IsOptional()
  @IsString()
  sourcePage?: string;

  @ApiProperty({ description: '风险等级 L1-L4', required: false })
  @IsOptional()
  @IsString()
  riskLevel?: string;
}
