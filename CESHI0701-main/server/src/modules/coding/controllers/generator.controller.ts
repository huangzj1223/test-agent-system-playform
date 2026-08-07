import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { BaseController } from '@/common/crud';
import { Perms } from '@/common/decorators';
import { IntrospectService } from '../services/introspect.service';
import { GeneratorService } from '../services/generator.service';
import { ListTablesDto, TableActionDto, GenerateDto } from '../dto/generator.dto';

/**
 * 代码生成器接口
 *
 * 前缀由 @Controller('admin/coding/generator') 显式声明，走 admin 鉴权体系 + 权限点（coding:generator:*）。
 * 默认仅超管或具备权限点的用户可用；生产环境禁止 generate。
 */
@ApiTags('代码生成器')
@Controller('admin/coding/generator')
export class GeneratorController extends BaseController {
  constructor(
    private readonly introspect: IntrospectService,
    private readonly generator: GeneratorService,
  ) {
    super();
  }

  /**
   * 列出当前数据库的表
   * @param dto 入参，可选 keyword 对表名做模糊过滤
   * @returns 匹配的表名列表
   */
  @Post('tables')
  @Perms('tables')
  @ApiOperation({ summary: '列出当前数据库的表' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: { type: 'array', items: { type: 'string' }, description: '数据库表名列表' },
      },
    },
  })
  async tables(@Body() dto: ListTablesDto) {
    return this.ok(await this.introspect.listTables(dto.keyword));
  }

  /**
   * 读取表结构并推断 IR（中间表示）
   * @param dto 表名、模块名、鉴权层级
   * @returns 由表结构推断出的 IR
   */
  @Post('introspect')
  @Perms('introspect')
  @ApiOperation({ summary: '读取表结构并推断 IR' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: { type: 'object', description: '推断出的实体 IR' },
      },
    },
  })
  async introspectTable(@Body() dto: TableActionDto) {
    return this.ok(await this.introspect.introspect(dto.tableName, dto.module, dto.tier));
  }

  /**
   * 预览生成的代码（不写盘）
   * 先内省得到 IR，再据此渲染模块代码，仅返回内容不落地，便于生成前确认。
   * @param dto 表名、模块名、鉴权层级
   * @returns 预览的模块代码内容
   */
  @Post('preview')
  @Perms('preview')
  @ApiOperation({ summary: '预览生成的代码（不写盘）' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: { type: 'object', description: '预览的模块代码内容' },
      },
    },
  })
  async preview(@Body() dto: TableActionDto) {
    const ir = await this.introspect.introspect(dto.tableName, dto.module, dto.tier);
    return this.ok(this.generator.previewModule([ir]));
  }

  /**
   * 生成并写入模块代码（含 Prisma model 片段）
   * 内省得到 IR 后写盘生成模块，并尝试向 schema 追加 Prisma model；
   * 追加成功时返回提示，需手动同步数据库以规避自动执行 DDL 的风险。
   * @param dto 表名、模块名、鉴权层级，以及 force（模块已存在时是否覆盖）
   * @returns 写盘结果、model 是否追加及后续操作提示
   */
  @Post('generate')
  @Perms('generate')
  @ApiOperation({ summary: '生成并写入模块代码（含 Prisma model 片段）' })
  @ApiOkResponse({
    schema: {
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: { type: 'object', description: '写盘结果与提示' },
      },
    },
  })
  async generate(@Body() dto: GenerateDto) {
    const ir = await this.introspect.introspect(dto.tableName, dto.module, dto.tier);
    const result = this.generator.writeModule([ir], dto.force);
    const modelAppended = this.generator.appendPrismaModel(ir);
    return this.ok({
      ...result,
      modelAppended,
      // model 变更后需手动同步，避免自动执行 DDL 的风险
      hint: modelAppended
        ? '已追加 Prisma model，请运行 npx prisma db push 同步数据库与客户端后重启服务'
        : 'Prisma model 已存在，未重复追加',
    });
  }
}
