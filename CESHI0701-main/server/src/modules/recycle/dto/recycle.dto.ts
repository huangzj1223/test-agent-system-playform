import { IsInt, IsPositive, IsArray, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 恢复回收站数据请求 DTO
 * 携带单条回收站记录 ID，用于将其恢复回原始数据表。
 */
export class RestoreDto {
  /** 回收站记录 ID，正整数 */
  @ApiProperty({ description: '回收站记录 ID' })
  @IsInt()
  @IsPositive()
  id: number;
}

/**
 * 清空回收站请求 DTO
 * 携带一批回收站记录 ID，用于物理删除（最多 100 条）。
 */
export class ClearRecycleDto {
  /** 回收站记录 ID 列表，非空且每项均为整数 */
  @ApiProperty({ description: '回收站记录 ID 列表', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  ids: number[];
}
