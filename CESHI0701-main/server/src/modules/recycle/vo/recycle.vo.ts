import { ApiProperty } from '@nestjs/swagger';

/**
 * 回收站数据响应 VO
 */
export class RecycleDataVo {
  @ApiProperty({ description: '回收站记录 ID' })
  id: number;

  @ApiProperty({ description: '实体名称' })
  entityName: string;

  @ApiProperty({ description: '原记录 ID' })
  entityId: number;

  @ApiProperty({ description: '原记录数据快照', type: Object })
  data: Record<string, any>;

  @ApiProperty({ description: '操作人 ID', nullable: true })
  userId: number | null;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}
