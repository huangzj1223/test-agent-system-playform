import {
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { BaseController } from './base.controller';
import { BaseService, PageOptions } from './base.service';
import { CrudOptions, getCrudOptions } from './crud.decorator';
import { ResultDto, PageResultDto } from '../dto/result.dto';
import { Perms } from '../decorators/perms.decorator';

/**
 * CRUD 控制器基类
 *
 * 内置 list/detail/add/update/update-status/delete/batch-delete 等标准接口，
 * 子类配合 @CrudController 装饰器声明前缀与查询字段后即可获得完整 CRUD 能力，
 * 无需重复编写路由与参数处理逻辑。
 */
export class CrudControllerBase extends BaseController {
  /**
   * @param service 通用 CRUD 服务，承载实际的数据库操作
   */
  constructor(protected readonly service: BaseService) {
    super();
  }

  // 读取 @CrudController 写入的元数据配置，无配置时返回空对象
  protected get crudOptions(): CrudOptions {
    return getCrudOptions(this.constructor) || {};
  }

  /** 列表/分页：GET {base}/list?page=1&pageSize=20&keyword=x&筛选字段 */
  @Get('list')
  @Perms('list')
  @ApiOperation({ summary: '分页/列表查询（支持 keyword 模糊与字段精确筛选）' })
  @ApiQuery({ name: 'page', required: false, description: '页码，从 1 开始' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页条数（1-100）' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键字（模糊匹配配置的字段）' })
  @ApiQuery({ name: 'order', required: false, description: '排序字段，默认 id' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], description: '排序方向，默认 desc' })
  @ApiOkResponse({ type: PageResultDto, description: '分页结果（list + pagination）' })
  async list(@Query() query: PageOptions & Record<string, any>) {
    const opts = this.crudOptions.pageQueryOp || {};
    const where = this.buildWhere(query, opts);
    // sort 做枚举校验，非法值丢弃，避免传入 Prisma 触发 500
    const sort = query.sort === 'asc' || query.sort === 'desc' ? query.sort : undefined;
    const options: PageOptions = {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      order: query.order,
      sort,
    };
    return this.ok(
      await this.service.page(options, where, opts.select, opts.include),
    );
  }

  /** 详情：GET {base}/detail/:id */
  @Get('detail/:id')
  @Perms('detail')
  @ApiOperation({ summary: '按 id 查询详情' })
  @ApiParam({ name: 'id', description: '记录 ID', type: Number })
  @ApiOkResponse({ type: ResultDto, description: '详情数据' })
  async detail(@Param('id', ParseIntPipe) id: number) {
    const opts = this.crudOptions.pageQueryOp || {};
    return this.ok(await this.service.info(id, opts.select, opts.include));
  }

  /** 新增：POST {base}/add */
  @Post('add')
  @Perms('add')
  @ApiOperation({ summary: '新增记录' })
  @ApiOkResponse({ type: ResultDto, description: '新增后的记录' })
  async add(@Body() body: any) {
    return this.ok(await this.service.add(body));
  }

  /** 更新：PUT {base}/update（body 含 id） */
  @Put('update')
  @Perms('update')
  @ApiOperation({ summary: '更新记录（body 须含 id）' })
  @ApiOkResponse({ type: ResultDto, description: '更新后的记录' })
  async update(@Body() body: any) {
    const { id, ...data } = body;
    if (!id || typeof id !== 'number') return this.fail('id 不能为空');
    return this.ok(await this.service.update(id, data));
  }

  /** 修改状态：PUT {base}/update-status（body: {id, status}） */
  @Put('update-status')
  @Perms('update-status')
  @ApiOperation({ summary: '修改状态（body: {id, status}）' })
  @ApiOkResponse({ type: ResultDto, description: '更新后的记录' })
  async updateStatus(@Body() body: { id: number; status: number }) {
    if (!body.id || typeof body.id !== 'number') return this.fail('id 不能为空');
    if (typeof body.status !== 'number') return this.fail('status 必须为数字');
    return this.ok(await this.service.update(body.id, { status: body.status }));
  }

  /** 单删：DELETE {base}/delete/:id */
  @Delete('delete/:id')
  @Perms('delete')
  @ApiOperation({ summary: '按 id 单条删除' })
  @ApiParam({ name: 'id', description: '记录 ID', type: Number })
  @ApiOkResponse({ type: ResultDto, description: '成功响应（data 为 null）' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete([id]);
    return this.ok();
  }

  /** 批量删除：POST {base}/batch-delete（body: {ids}） */
  @Post('batch-delete')
  @Perms('batch-delete')
  @ApiOperation({ summary: '批量删除（body: {ids: number[]}）' })
  @ApiOkResponse({ type: ResultDto, description: '成功响应（data 为 null）' })
  async batchDelete(@Body() body: { ids: number[] }) {
    if (!body.ids?.length || !body.ids.every((id) => typeof id === 'number')) {
      return this.fail('ids 格式不正确');
    }
    await this.service.delete(body.ids);
    return this.ok();
  }

  /**
   * 依据配置与查询参数构建 Prisma where 条件
   * @param query 原始查询参数（含 keyword 及各筛选字段）
   * @param opts 分页查询配置（模糊字段、精确字段）
   * @returns Prisma where 对象
   */
  private buildWhere(
    query: Record<string, any>,
    opts: NonNullable<CrudOptions['pageQueryOp']>,
  ): Record<string, any> {
    const where: Record<string, any> = {};

    // 关键字命中任一模糊字段即可（OR 连接）
    if (opts.keyWordLikeFields?.length && query.keyword) {
      where.OR = opts.keyWordLikeFields.map((field) => ({
        [field]: { contains: query.keyword },
      }));
    }

    // 精确匹配字段：跳过空值与对象类型，避免非法条件传入 Prisma
    if (opts.fieldEq?.length) {
      for (const field of opts.fieldEq) {
        const val = query[field];
        if (val !== undefined && val !== null && val !== '' && typeof val !== 'object') {
          // query 参数恒为字符串，纯整数字符串需转回数字，否则 Int 字段会触发 Prisma 校验错误
          where[field] =
            typeof val === 'string' && /^-?\d+$/.test(val) ? Number(val) : val;
        }
      }
    }

    return where;
  }
}
