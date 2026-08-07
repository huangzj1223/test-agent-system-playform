import { IsString, IsOptional, IsBoolean, IsIn, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 表名校验：字母开头，仅允许字母数字下划线（防注入与非法表名） */
const TABLE_NAME_RULE = /^[A-Za-z][A-Za-z0-9_]*$/;

/** 列出数据库表 */
export class ListTablesDto {
  @ApiProperty({ description: '表名模糊过滤', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;
}

/** 读取表结构 / 预览 / 生成 的公共入参 */
export class TableActionDto {
  @ApiProperty({ description: '数据库表名' })
  @IsString()
  @MaxLength(64)
  @Matches(TABLE_NAME_RULE, { message: '表名非法' })
  tableName: string;

  @ApiProperty({ description: '模块名（kebab-case），默认由表名推导', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9-]*$/, { message: '模块名须为 kebab-case（小写字母开头，仅含小写字母/数字/连字符）' })
  module?: string;

  @ApiProperty({ description: '鉴权体系层级 admin/app，默认 admin', required: false, enum: ['admin', 'app'] })
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'app'], { message: 'tier 只能是 admin 或 app' })
  tier?: 'admin' | 'app';
}

/** 生成（写盘）入参 */
export class GenerateDto extends TableActionDto {
  @ApiProperty({ description: '模块已存在时是否覆盖', required: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
