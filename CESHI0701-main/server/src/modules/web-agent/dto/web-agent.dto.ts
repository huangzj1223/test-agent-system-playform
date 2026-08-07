import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WEB_SITE_KEYS } from '../web-agent.sites';

/**
 * 读取网页正文入参。
 * 两种用法二选一：
 * - site + keyword：按站点白名单模板拼搜索 URL（如 bilibili + 凡人修仙传）
 * - url：直接读取任意 http/https 地址（走 SSRF 校验）
 */
export class ReadPageDto {
  @ApiPropertyOptional({ description: '站点白名单键（如 bilibili/baidu/taobao/zhihu/youtube）' })
  @IsOptional()
  @IsString()
  @IsIn(WEB_SITE_KEYS, { message: '不支持的站点' })
  site?: string;

  @ApiPropertyOptional({ description: '搜索关键词（配合 site 使用）' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @ApiPropertyOptional({ description: '直接读取的完整 URL（http/https）' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;
}
