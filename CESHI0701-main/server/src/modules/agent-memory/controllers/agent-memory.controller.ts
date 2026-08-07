import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaseController } from '@/common/crud';
import { Perms, Admin } from '@/common/decorators';
import { AgentMemoryService } from '../services/agent-memory.service';
import { MemoryVersionService } from '../services/memory-version.service';
import { MemorySuggestionService } from '../services/memory-suggestion.service';
import {
  MemoryListQueryDto,
  MemoryDetailDto,
  CreateMemoryDto,
  SaveMemoryContentDto,
  UpdateMemoryPermissionDto,
  ToggleMemoryDto,
  DeleteMemoryDto,
  MemoryVersionQueryDto,
  RollbackMemoryDto,
  ConfirmPendingDto,
  IgnorePendingDto,
  CreatePendingDto,
  SuggestionListDto,
  ApplySuggestionDto,
  IgnoreSuggestionDto,
  CheckMemoryWriteDto,
  RecordReadDto,
} from '../dto/agent-memory.dto';

/**
 * 记忆中心管理接口
 *
 * 前缀 admin/agent-memory，走 admin 鉴权体系 + 权限点（agent-memory:*）。
 * 读取链路：列表 / 统计 / 详情；写入链路：新建 / 保存 / 权限 / 启停 / 删除。
 * 写入类接口（save/confirm/apply）在 service 层经安全策略统一治理（fail-closed）。
 */
@ApiTags('记忆中心')
@Controller('admin/agent-memory')
export class AgentMemoryController extends BaseController {
  constructor(
    private readonly service: AgentMemoryService,
    private readonly versionService: MemoryVersionService,
    private readonly suggestionService: MemorySuggestionService,
  ) {
    super();
  }

  /** 记忆文件列表（筛选） */
  @Post('list')
  @Perms('list')
  @ApiOperation({ summary: '记忆文件列表' })
  async list(@Body() query: MemoryListQueryDto, @Admin('userId') userId: number) {
    return this.ok(await this.service.listWithFilter(query, userId));
  }

  /** 顶部统计卡片 */
  @Post('stats')
  @Perms('list')
  @ApiOperation({ summary: '记忆中心统计概览' })
  async stats(@Admin('userId') userId: number) {
    return this.ok(await this.service.stats(userId));
  }

  /** 单文件详情（含版本历史、模型建议） */
  @Post('detail')
  @Perms('list')
  @ApiOperation({ summary: '记忆文件详情' })
  async detail(@Body() dto: MemoryDetailDto, @Admin('userId') userId: number) {
    return this.ok(await this.service.detail(dto.memoryKey, userId));
  }

  /** 新建记忆文件 */
  @Post('create')
  @Perms('add')
  @ApiOperation({ summary: '新建记忆文件' })
  async create(@Body() dto: CreateMemoryDto, @Admin() admin: { userId: number; username: string }) {
    return this.ok(await this.service.create(dto, admin?.username, admin?.userId));
  }

  /** 保存记忆文件内容（写入前过安全策略统一治理） */
  @Post('save')
  @Perms('update')
  @ApiOperation({ summary: '保存记忆内容' })
  async save(@Body() dto: SaveMemoryContentDto, @Admin() admin: { userId: number; username: string }) {
    return this.ok(
      await this.service.saveContent(dto.memoryKey, dto.content, admin?.username, admin?.userId),
    );
  }

  /** 记忆写入前安全策略预判（仅登录，与安全策略 check 一致；前端据此 fail-closed） */
  @Post('check')
  @ApiOperation({ summary: '记忆写入前安全裁决' })
  async check(@Body() dto: CheckMemoryWriteDto, @Admin('userId') userId: number) {
    return this.ok(await this.service.checkWrite(dto.memoryKey, dto.text ?? '', userId));
  }

  /** 记录记忆读取埋点（仅登录；对话注入记忆时调用，命中率数据来源） */
  @Post('read-log/record')
  @ApiOperation({ summary: '记录记忆读取埋点' })
  async recordRead(@Body() dto: RecordReadDto, @Admin('userId') userId: number) {
    return this.ok(await this.service.recordRead(dto.items, userId));
  }

  /** 更新记忆文件权限 */
  @Post('permission')
  @Perms('update')
  @ApiOperation({ summary: '更新记忆权限' })
  async permission(@Body() dto: UpdateMemoryPermissionDto, @Admin() admin: { userId: number; username: string }) {
    const { memoryKey, ...patch } = dto;
    return this.ok(await this.service.updatePermission(memoryKey, patch, admin?.username, admin?.userId));
  }

  /** 启用/停用记忆文件 */
  @Post('toggle')
  @Perms('update')
  @ApiOperation({ summary: '启用/停用记忆文件' })
  async toggle(@Body() dto: ToggleMemoryDto, @Admin() admin: { userId: number; username: string }) {
    return this.ok(await this.service.toggle(dto.memoryKey, dto.enabled, admin?.username, admin?.userId));
  }

  /** 删除记忆文件（内置不可删） */
  @Post('delete')
  @Perms('delete')
  @ApiOperation({ summary: '删除记忆文件' })
  async delete(@Body() dto: DeleteMemoryDto, @Admin('userId') userId: number) {
    return this.ok(await this.service.remove(dto.memoryKey, userId));
  }

  /** 版本历史列表 */
  @Post('version/list')
  @Perms('list')
  @ApiOperation({ summary: '记忆版本历史' })
  async versionList(@Body() dto: MemoryVersionQueryDto, @Admin('userId') userId: number) {
    return this.ok(await this.versionService.listVersions(dto.memoryKey, userId, dto.page, dto.pageSize));
  }

  /** 回滚到指定版本 */
  @Post('version/rollback')
  @Perms('update')
  @ApiOperation({ summary: '回滚记忆版本' })
  async versionRollback(@Body() dto: RollbackMemoryDto, @Admin() admin: { userId: number; username: string }) {
    return this.ok(
      await this.versionService.rollback(dto.memoryKey, dto.version, admin?.username, admin?.userId),
    );
  }

  /**
   * 新建待确认记忆（对话侧智能体 memory.suggest 工具调用）。
   * 仅登录即可（与 check/read-log 一致）：只入队待确认，不改动文件，风险低；
   * 真正写入仍需具备 update 权限的管理员在记忆中心 confirm，届时过安全策略。
   */
  @Post('pending/create')
  @ApiOperation({ summary: '新建待确认记忆（智能体建议）' })
  async pendingCreate(@Body() dto: CreatePendingDto, @Admin('userId') userId: number) {
    return this.ok(
      await this.suggestionService.createPending(dto.text, dto.targetKey, dto.source, userId),
    );
  }

  /** 待确认记忆列表 */
  @Post('pending/list')
  @Perms('list')
  @ApiOperation({ summary: '待确认记忆列表' })
  async pendingList(@Admin('userId') userId: number) {
    return this.ok(await this.suggestionService.listPending(userId));
  }

  /** 确认待确认记忆（追加到目标文件） */
  @Post('pending/confirm')
  @Perms('update')
  @ApiOperation({ summary: '确认待确认记忆' })
  async pendingConfirm(@Body() dto: ConfirmPendingDto, @Admin() admin: { userId: number; username: string }) {
    return this.ok(
      await this.suggestionService.confirmPending(dto.id, dto.text, admin?.username, admin?.userId),
    );
  }

  /** 忽略待确认记忆 */
  @Post('pending/ignore')
  @Perms('update')
  @ApiOperation({ summary: '忽略待确认记忆' })
  async pendingIgnore(@Body() dto: IgnorePendingDto, @Admin('userId') userId: number) {
    return this.ok(await this.suggestionService.ignorePending(dto.id, userId));
  }

  /** 模型建议列表 */
  @Post('suggestion/list')
  @Perms('list')
  @ApiOperation({ summary: '模型建议列表' })
  async suggestionList(@Body() dto: SuggestionListDto, @Admin('userId') userId: number) {
    return this.ok(await this.suggestionService.listSuggestions(dto.memoryKey, userId));
  }

  /** 应用模型建议（追加到所属文件） */
  @Post('suggestion/apply')
  @Perms('update')
  @ApiOperation({ summary: '应用模型建议' })
  async suggestionApply(@Body() dto: ApplySuggestionDto, @Admin() admin: { userId: number; username: string }) {
    return this.ok(
      await this.suggestionService.applySuggestion(dto.id, dto.text, admin?.username, admin?.userId),
    );
  }

  /** 忽略模型建议 */
  @Post('suggestion/ignore')
  @Perms('update')
  @ApiOperation({ summary: '忽略模型建议' })
  async suggestionIgnore(@Body() dto: IgnoreSuggestionDto, @Admin('userId') userId: number) {
    return this.ok(await this.suggestionService.ignoreSuggestion(dto.id, userId));
  }
}
