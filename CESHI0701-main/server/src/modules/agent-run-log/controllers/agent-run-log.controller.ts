import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaseController } from '@/common/crud';
import { Perms, Admin } from '@/common/decorators';
import { RunLogQueryService, RunLogFilter } from '../services/run-log-query.service';
import { RunLogService } from '../services/run-log.service';
import {
  RunLogListDto,
  RunLogDetailDto,
  RunLogExportDto,
  RunLogMarkProcessedDto,
  RunLogRecordDto,
} from '../dto/agent-run-log.dto';

/**
 * 运行日志接口（方案C混合）
 *
 * 前缀 admin/agent-run-log，走 admin 鉴权 + 权限点（agent-run-log:*）。
 * list/category-count/detail/export 为跨 4 源聚合的只读查询；
 * record 供系统写 conversation/system/error；mark-processed 标记错误日志已处理。
 */
@ApiTags('运行日志')
@Controller('admin/agent-run-log')
export class AgentRunLogController extends BaseController {
  constructor(
    private readonly queryService: RunLogQueryService,
    private readonly runLogService: RunLogService,
  ) {
    super();
  }

  /** 从 DTO 提取聚合过滤条件 */
  private toFilter(dto: RunLogListDto | RunLogExportDto): RunLogFilter {
    return {
      type: dto.type,
      status: dto.status,
      agent: dto.agent,
      keyword: dto.keyword,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
    };
  }

  /** 运行日志列表（跨 4 源聚合 + 分页） */
  @Post('list')
  @Perms('list')
  @ApiOperation({ summary: '运行日志列表（聚合+分页）' })
  async list(@Body() dto: RunLogListDto) {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const pageSize = dto.pageSize && dto.pageSize > 0 ? dto.pageSize : 10;
    return this.ok(await this.queryService.list(this.toFilter(dto), page, pageSize));
  }

  /** 分类计数（6 类） */
  @Post('category-count')
  @Perms('list')
  @ApiOperation({ summary: '运行日志分类计数' })
  async categoryCount(@Body() dto: RunLogListDto) {
    return this.ok(await this.queryService.categoryCount(this.toFilter(dto)));
  }

  /** 日志详情（按带前缀 id 回查源表） */
  @Post('detail')
  @Perms('list')
  @ApiOperation({ summary: '运行日志详情' })
  async detail(@Body() dto: RunLogDetailDto) {
    return this.ok(await this.queryService.detail(dto.id));
  }

  /** 导出（复用过滤，不分页） */
  @Post('export')
  @Perms('list')
  @ApiOperation({ summary: '运行日志导出' })
  async export(@Body() dto: RunLogExportDto) {
    return this.ok(await this.queryService.export(this.toFilter(dto)));
  }

  /** 标记错误日志已处理（仅本表 run- 记录） */
  @Post('mark-processed')
  @Perms('update')
  @ApiOperation({ summary: '标记运行日志已处理' })
  async markProcessed(@Body() dto: RunLogMarkProcessedDto) {
    const ok = await this.runLogService.markProcessed(dto.id);
    return ok ? this.ok() : this.fail('仅支持标记本表(run-)日志，或记录不存在');
  }

  /** 记录一条 conversation/system/error 日志（内部/系统调用） */
  @Post('record')
  @Perms('add')
  @ApiOperation({ summary: '记录运行日志（conversation/system/error）' })
  async record(
    @Body() dto: RunLogRecordDto,
    @Admin() admin: { userId: number; username: string },
  ) {
    const id = await this.runLogService.record({
      ...dto,
      userId: admin?.userId,
      userName: admin?.username,
    });
    return id ? this.ok({ id }) : this.fail('日志写入失败');
  }
}
