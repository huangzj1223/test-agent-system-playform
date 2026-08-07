import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaseController } from '@/common/crud';
import { Perms, Admin } from '@/common/decorators';
import { AgentToolService } from '../services/agent-tool.service';
import {
  CreateToolDto,
  UpdateToolDto,
  ToggleToolDto,
  DeleteToolDto,
  ToolListQueryDto,
  RecordToolCallDto,
  ToolCallLogQueryDto,
  ToolCheckDto,
  SyncRegistryDto,
} from '../dto/agent-tool.dto';

/**
 * 工具权限管理接口
 *
 * 前缀 admin/agent-tool，走 admin 鉴权体系 + 权限点（agent-tool:*）。
 * 管理智能体可调用的工具（CLI/API/数据库/文件/页面/浏览器/外部服务）及其调用日志。
 * check 委托安全策略统一校验，供 Skills 执行前复用。
 */
@ApiTags('工具权限')
@Controller('admin/agent-tool')
export class AgentToolController extends BaseController {
  constructor(private readonly service: AgentToolService) {
    super();
  }

  @Post('list')
  @Perms('list')
  @ApiOperation({ summary: '工具列表（筛选分页）' })
  async list(@Body() query: ToolListQueryDto) {
    return this.ok(await this.service.listWithFilter(query));
  }

  @Post('stats')
  @Perms('list')
  @ApiOperation({ summary: '工具统计概览' })
  async stats() {
    return this.ok(await this.service.stats());
  }

  @Post('categories')
  @Perms('list')
  @ApiOperation({ summary: '工具分类计数' })
  async categories() {
    return this.ok(await this.service.categoryCounts());
  }

  @Post('add')
  @Perms('add')
  @ApiOperation({ summary: '新建工具' })
  async add(@Body() dto: CreateToolDto) {
    return this.ok(await this.service.createTool(dto));
  }

  @Post('update')
  @Perms('update')
  @ApiOperation({ summary: '更新工具' })
  async update(@Body() dto: UpdateToolDto) {
    const { id, ...rest } = dto;
    await this.service.updateTool(id, rest);
    return this.ok();
  }

  @Post('toggle')
  @Perms('update')
  @ApiOperation({ summary: '切换工具启用状态' })
  async toggle(@Body() dto: ToggleToolDto) {
    await this.service.toggle(dto.id, dto.enabled);
    return this.ok();
  }

  @Post('delete')
  @Perms('delete')
  @ApiOperation({ summary: '删除工具' })
  async remove(@Body() dto: DeleteToolDto) {
    await this.service.remove(dto.id);
    return this.ok();
  }

  @Post('call-log/list')
  @Perms('list')
  @ApiOperation({ summary: '工具调用日志列表' })
  async callLogList(@Body() query: ToolCallLogQueryDto) {
    return this.ok(await this.service.callLogList(query.toolKey, query.page, query.pageSize));
  }

  /**
   * 记录一次工具调用日志（聊天前端埋点）。
   * 不声明 @Perms —— 每个发起对话的登录用户都需能写入。
   */
  @Post('call-log/record')
  @ApiOperation({ summary: '记录工具调用日志' })
  async recordCall(@Body() dto: RecordToolCallDto, @Admin('userId') userId: number) {
    await this.service.recordCall(dto, userId);
    return this.ok();
  }

  /**
   * 工具权限校验（委托安全策略统一校验）。
   * 仅需登录即可调用（不声明 @Perms），是运行时防护。
   */
  @Post('check')
  @ApiOperation({ summary: '工具权限校验' })
  async check(@Body() dto: ToolCheckDto, @Admin('userId') userId: number) {
    return this.ok(await this.service.checkToolPermission(dto.toolKey, dto.action ?? 'execute', dto.payload, userId));
  }

  /**
   * 同步前端注册表工具清单（幂等 upsert）。
   * 聊天前端挂载时上报真实可调用工具，仅需登录（不声明 @Perms）。
   */
  @Post('sync-registry')
  @ApiOperation({ summary: '同步前端注册表工具清单' })
  async syncRegistry(@Body() dto: SyncRegistryDto) {
    return this.ok(await this.service.syncRegistry(dto.tools));
  }

  /**
   * 工具治理映射（toolKey → 启用/需确认）。
   * 聊天前端下发工具前拉取，过滤禁用工具。仅需登录（不声明 @Perms）。
   */
  @Post('governance')
  @ApiOperation({ summary: '工具治理映射' })
  async governance() {
    return this.ok(await this.service.getGovernance());
  }
}
