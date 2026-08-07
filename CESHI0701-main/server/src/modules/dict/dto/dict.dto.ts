import { IsArray, IsString, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 批量获取字典项请求 DTO
 * 用于按字典类型 key 列表一次性拉取多组字典项，最多 50 个 key。
 */
export class GetDictByKeysDto {
  /** 字典类型 key 列表，非空且每项均为字符串 */
  @ApiProperty({ description: '字典类型 key 列表', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  keys: string[];
}
