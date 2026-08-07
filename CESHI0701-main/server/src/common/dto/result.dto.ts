import { ApiProperty } from '@nestjs/swagger';

/**
 * 统一响应外壳
 *
 * 所有接口经 TransformInterceptor 包装后的标准结构：{ code, data, message }。
 * data 字段的具体类型由各接口通过 @ApiResult(VO) 等装饰器单独声明，此处为通用占位。
 */
export class ResultDto {
  @ApiProperty({ description: '业务状态码：200 成功，400 业务错误，401 未登录，403 无权限，500 服务器错误', example: 200 })
  code: number;

  @ApiProperty({ description: '提示信息', example: 'success' })
  message: string;

  @ApiProperty({ description: '业务数据', nullable: true })
  data: any;
}

/**
 * 分页数据结构（对应 data 字段内层）
 * 列表数据 + 分页元信息。
 */
export class PaginationDto {
  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  pageSize: number;

  @ApiProperty({ description: '总记录数', example: 100 })
  total: number;
}

/**
 * 分页响应的 data 内层结构：{ list, pagination }
 * 泛型 list 的元素类型由 @ApiPageResult(VO) 在 schema 层注入，此处为通用占位。
 */
export class PageDataDto {
  @ApiProperty({ description: '当前页数据列表', type: [Object] })
  list: any[];

  @ApiProperty({ description: '分页元信息', type: PaginationDto })
  pagination: PaginationDto;
}

/**
 * 分页响应外壳：{ code, data: { list, pagination }, message }
 * 供 CRUD 基类等无具体 VO 的场景直接标注；data 元素精确类型用 @ApiPageResult(VO) 表达。
 */
export class PageResultDto {
  @ApiProperty({ description: '业务状态码', example: 200 })
  code: number;

  @ApiProperty({ description: '提示信息', example: 'success' })
  message: string;

  @ApiProperty({ description: '分页数据', type: PageDataDto })
  data: PageDataDto;
}

