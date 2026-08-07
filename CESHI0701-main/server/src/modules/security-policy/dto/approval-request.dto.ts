import { IsString, IsOptional, IsInt, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ACTION_TYPES, APPROVAL_STATUS } from '../catalog/security-policy.enums';

/** 审批工单列表查询入参 */
export class ApprovalRequestQueryDto {
  @ApiPropertyOptional({ description: '工单状态', enum: APPROVAL_STATUS })
  @IsOptional()
  @IsString()
  @IsIn(APPROVAL_STATUS as unknown as string[])
  status?: string;

  @ApiPropertyOptional({ description: '操作类型', enum: ACTION_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(ACTION_TYPES as unknown as string[])
  actionType?: string;

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

/** 审批决策入参 */
export class ApprovalDecideDto {
  @ApiProperty({ description: '工单主键 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '决策（approved 通过 / rejected 拒绝）', enum: ['approved', 'rejected'] })
  @IsString()
  @IsIn(['approved', 'rejected'])
  decision: string;

  @ApiPropertyOptional({ description: '审批意见' })
  @IsOptional()
  @IsString()
  remark?: string;
}
