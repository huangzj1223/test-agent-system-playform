import { ApiProperty } from '@nestjs/swagger';

/**
 * 字典类型响应 VO
 */
export class DictTypeVo {
  @ApiProperty({ description: '字典类型 ID' })
  id: number;

  @ApiProperty({ description: '类型名称' })
  name: string;

  @ApiProperty({ description: '类型键' })
  key: string;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

/**
 * 字典项响应 VO
 */
export class DictInfoVo {
  @ApiProperty({ description: '字典项 ID' })
  id: number;

  @ApiProperty({ description: '所属类型 ID' })
  typeId: number;

  @ApiProperty({ description: '字典项名称' })
  name: string;

  @ApiProperty({ description: '字典项值' })
  value: string;

  @ApiProperty({ description: '排序号' })
  orderNum: number;

  @ApiProperty({ description: '备注', nullable: true })
  remark: string | null;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}
