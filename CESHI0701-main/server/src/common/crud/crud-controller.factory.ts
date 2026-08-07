import { Get, Param, ParseIntPipe, Query, Type } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CrudControllerBase } from './crud-controller.base';
import { PageOptions } from './base.service';
import { ApiResult, ApiPageResult } from '../decorators/api-result.decorator';
import { Perms } from '../decorators/perms.decorator';

/**
 * CRUD 控制器工厂（带响应 VO 精确标注）
 *
 * 基类 CrudControllerBase 的响应只能标通用外壳（data 为 object），因为静态装饰器
 * 无法感知子类的实体类型。本工厂通过闭包捕获具体 VO，覆盖 list/detail 的响应标注，
 * 使 Swagger 文档的 data 精确到实体字段。
 *
 * 用法：
 *   export class DictTypeController extends CrudControllerFactory(DictTypeVo) { ... }
 *
 * 仅覆盖"有数据返回"的读接口（list/detail）做精确标注；add/update 等写接口沿用基类外壳。
 * 方法体直接委托基类，不重复任何业务逻辑。
 *
 * @param vo 该模块实体的响应 VO 类
 */
export function CrudControllerFactory<T extends Type<any>>(vo: T): typeof CrudControllerBase {
  class CrudControllerWithVo extends CrudControllerBase {
    /** 列表/分页（data 精确到 VO 数组） */
    @Get('list')
    @Perms('list')
    @ApiOperation({ summary: '分页/列表查询（支持 keyword 模糊与字段精确筛选）' })
    @ApiQuery({ name: 'page', required: false, description: '页码，从 1 开始' })
    @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（1-100）' })
    @ApiQuery({ name: 'keyword', required: false, description: '关键字（模糊匹配配置的字段）' })
    @ApiQuery({ name: 'order', required: false, description: '排序字段，默认 id' })
    @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], description: '排序方向，默认 desc' })
    @ApiPageResult(vo)
    async list(@Query() query: PageOptions & Record<string, any>) {
      return super.list(query);
    }

    /** 详情（data 精确到 VO） */
    @Get('detail/:id')
    @Perms('detail')
    @ApiOperation({ summary: '按 id 查询详情' })
    @ApiParam({ name: 'id', description: '记录 ID', type: Number })
    @ApiResult(vo)
    async detail(@Param('id', ParseIntPipe) id: number) {
      return super.detail(id);
    }
  }

  // 动态命名，避免多个工厂实例同名导致 Swagger operationId 冲突
  Object.defineProperty(CrudControllerWithVo, 'name', {
    value: `Crud${vo.name}Controller`,
  });

  return CrudControllerWithVo;
}
