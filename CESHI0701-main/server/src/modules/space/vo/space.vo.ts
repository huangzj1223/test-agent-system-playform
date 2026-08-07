import { ApiProperty } from '@nestjs/swagger';

/**
 * 空间文件响应 VO
 */
export class SpaceInfoVo {
  @ApiProperty({ description: '文件 ID' })
  id: number;

  @ApiProperty({ description: '文件 URL' })
  url: string;

  @ApiProperty({ description: '文件类型', nullable: true })
  type: string | null;

  @ApiProperty({ description: '分类 ID', nullable: true })
  classifyId: number | null;

  @ApiProperty({ description: '文件名', nullable: true })
  name: string | null;

  @ApiProperty({ description: '文件大小（字节）', nullable: true })
  size: number | null;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}

/**
 * 空间分类响应 VO
 */
export class SpaceTypeVo {
  @ApiProperty({ description: '分类 ID' })
  id: number;

  @ApiProperty({ description: '分类名称' })
  name: string;

  @ApiProperty({ description: '父分类 ID', nullable: true })
  parentId: number | null;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}
