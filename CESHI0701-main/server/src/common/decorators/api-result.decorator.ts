import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ResultDto, PaginationDto } from '../dto/result.dto';

/**
 * 响应文档装饰器
 *
 * 统一响应外壳为 { code, data, message }，本组装饰器用于在 Swagger 中
 * 把外壳与具体的 data 类型组合表达，使 /docs 的 Responses 显示完整返回结构。
 *
 * 用法：
 *   @ApiResult(UserVo)        // data 为单个对象
 *   @ApiArrayResult(UserVo)   // data 为对象数组
 *   @ApiPageResult(UserVo)    // data 为分页结构 { list:[VO], pagination }
 *   @ApiOkVoid()              // data 为 null（无返回体的写操作）
 */

/** 外壳通用属性（code/message），data 由各装饰器单独拼接 */
const SHELL_PROPS = {
  code: { type: 'number', example: 200 },
  message: { type: 'string', example: 'success' },
};

/**
 * data 为单个对象：{ code, data: VO, message }
 * @param model 响应数据的 VO 类
 */
export function ApiResult<TModel extends Type<any>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(ResultDto, model),
    ApiOkResponse({
      schema: {
        properties: {
          ...SHELL_PROPS,
          data: { $ref: getSchemaPath(model) },
        },
      },
    }),
  );
}

/**
 * data 为对象数组：{ code, data: VO[], message }
 * @param model 数组元素的 VO 类
 */
export function ApiArrayResult<TModel extends Type<any>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(ResultDto, model),
    ApiOkResponse({
      schema: {
        properties: {
          ...SHELL_PROPS,
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
        },
      },
    }),
  );
}

/**
 * data 为分页结构：{ code, data: { list: VO[], pagination }, message }
 * @param model 列表元素的 VO 类
 */
export function ApiPageResult<TModel extends Type<any>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(ResultDto, PaginationDto, model),
    ApiOkResponse({
      schema: {
        properties: {
          ...SHELL_PROPS,
          data: {
            type: 'object',
            properties: {
              list: { type: 'array', items: { $ref: getSchemaPath(model) } },
              pagination: { $ref: getSchemaPath(PaginationDto) },
            },
          },
        },
      },
    }),
  );
}

/**
 * data 为 null 的成功响应（无返回体的写操作，如删除/启停）
 */
export function ApiOkVoid() {
  return applyDecorators(
    ApiExtraModels(ResultDto),
    ApiOkResponse({
      schema: {
        properties: {
          ...SHELL_PROPS,
          data: { type: 'null', nullable: true, example: null },
        },
      },
    }),
  );
}
