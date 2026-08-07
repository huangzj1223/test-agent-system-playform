import { ApiProperty } from '@nestjs/swagger';

/**
 * 定时任务响应 VO
 */
export class TaskInfoVo {
  @ApiProperty({ description: '任务 ID' })
  id: number;

  @ApiProperty({ description: '任务名称' })
  name: string;

  @ApiProperty({ description: 'cron 表达式', nullable: true })
  cron: string | null;

  @ApiProperty({ description: '固定间隔秒数', nullable: true })
  every: number | null;

  @ApiProperty({ description: '执行次数限制', nullable: true })
  limit: number | null;

  @ApiProperty({ description: '处理器标识', nullable: true })
  service: string | null;

  @ApiProperty({ description: '任务携带数据 JSON', nullable: true })
  data: string | null;

  @ApiProperty({ description: '备注', nullable: true })
  remark: string | null;

  @ApiProperty({ description: '状态 1=运行 0=停止' })
  status: number;

  @ApiProperty({ description: '类型' })
  type: number;

  @ApiProperty({ description: '任务类型 0=cron 1=固定间隔' })
  taskType: number;

  @ApiProperty({ description: '开始时间', nullable: true })
  startDate: string | null;

  @ApiProperty({ description: '结束时间', nullable: true })
  endDate: string | null;

  @ApiProperty({ description: '下次执行时间', nullable: true })
  nextRunTime: string | null;

  @ApiProperty({ description: '上次执行时间', nullable: true })
  lastExecuteTime: string | null;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

/**
 * 定时任务执行日志响应 VO
 */
export class TaskLogVo {
  @ApiProperty({ description: '日志 ID' })
  id: number;

  @ApiProperty({ description: '所属任务 ID' })
  taskId: number;

  @ApiProperty({ description: '执行状态 1=成功 0=失败' })
  status: number;

  @ApiProperty({ description: '执行详情', nullable: true })
  detail: string | null;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}
