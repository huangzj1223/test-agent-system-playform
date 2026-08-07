import {
  IsInt,
  IsPositive,
  IsString,
  IsOptional,
  IsIn,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 任务操作入参：用于启动/停止/立即执行等仅需任务 ID 的接口 */
export class TaskOpDto {
  @ApiProperty({ description: '任务 ID' })
  @IsInt()
  @IsPositive()
  id: number;
}

/**
 * 新增任务入参
 * taskType 决定调度方式：0=cron（用 cron 字段），1=固定间隔（用 every 字段，单位秒）。
 * service 为已注册的处理器标识，data 为传给处理器的 JSON 字符串。
 */
export class CreateTaskDto {
  @ApiProperty({ description: '任务名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '任务类型 0=cron 1=固定间隔' })
  @IsInt()
  @IsIn([0, 1])
  taskType: number;

  @ApiProperty({ description: 'cron 表达式', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[\d\s*/,\-?LW#]+$/, { message: 'cron 表达式格式非法' })
  cron?: string;

  @ApiProperty({ description: '固定间隔秒数', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(86400)
  every?: number;

  @ApiProperty({ description: '处理器标识', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  service?: string;

  @ApiProperty({ description: '任务携带数据(JSON)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  data?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

/** 修改任务入参：在新增字段基础上追加目标任务 ID */
export class UpdateTaskDto extends CreateTaskDto {
  @ApiProperty({ description: '任务 ID' })
  @IsInt()
  @IsPositive()
  id: number;
}
