import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaseController } from '@/common/crud';
import { Perms, Admin } from '@/common/decorators';
import { AgentSkillService } from '../services/agent-skill.service';
import { SkillTestService } from '../services/skill-test.service';
import { SkillVersionService } from '../services/skill-version.service';
import { SkillPortService } from '../services/skill-port.service';
import {
  CreateAgentSkillDto,
  UpdateAgentSkillDto,
  ToggleAgentSkillDto,
  DeleteAgentSkillDto,
  SkillListQueryDto,
  TestSkillCapabilityDto,
  SkillCheckDto,
  SkillVersionQueryDto,
  RollbackSkillDto,
  ExportSkillsDto,
  ImportSkillsDto,
  RecordSkillRunDto,
  SkillRunLogQueryDto,
} from '../dto/agent-skill.dto';

/**
 * 智能体技能管理接口
 *
 * 前缀 admin/agent-skill，走 admin 鉴权体系 + 权限点（agent-skill:*）。
 * 管理端配置技能开关/增删；enabled 供聊天前端拉取已启用技能的工具定义。
 */
@ApiTags('智能体技能')
@Controller('admin/agent-skill')
export class AgentSkillController extends BaseController {
  constructor(
    private readonly service: AgentSkillService,
    private readonly testService: SkillTestService,
    private readonly versionService: SkillVersionService,
    private readonly portService: SkillPortService,
  ) {
    super();
  }

  /** 技能列表（筛选 + 分页，管理 UI 用；附带运行统计） */
  @Post('list')
  @Perms('list')
  @ApiOperation({ summary: '技能列表（筛选分页）' })
  async list(@Body() query: SkillListQueryDto) {
    return this.ok(await this.service.listWithFilter(query));
  }

  /** 顶部统计卡片：全部/已启用/高风险/近7日调用/失效率 */
  @Post('stats')
  @Perms('list')
  @ApiOperation({ summary: '技能统计概览' })
  async stats() {
    return this.ok(await this.service.stats());
  }

  /** 左侧分类计数 */
  @Post('categories')
  @Perms('list')
  @ApiOperation({ summary: '技能分类计数' })
  async categories() {
    return this.ok(await this.service.categoryCounts());
  }

  /** 某技能的运行日志分页列表 */
  @Post('run-log/list')
  @Perms('list')
  @ApiOperation({ summary: '技能运行日志列表' })
  async runLogList(@Body() query: SkillRunLogQueryDto) {
    return this.ok(
      await this.service.runLogList(query.skillId, query.page, query.pageSize, query.success),
    );
  }

  /**
   * 记录一次技能运行日志（聊天前端埋点）。
   * 不声明 @Perms —— 每个发起对话的登录用户都需能写入，仅需登录即可。
   */
  @Post('run-log/record')
  @ApiOperation({ summary: '记录技能运行日志' })
  async recordRun(@Body() dto: RecordSkillRunDto, @Admin('userId') userId: number) {
    await this.service.recordRun(dto, userId);
    return this.ok();
  }

  /** 能力目录（新建技能时供勾选） */
  @Post('catalog')
  @Perms('catalog')
  @ApiOperation({ summary: '能力目录' })
  catalog() {
    return this.ok(this.service.listCatalog());
  }

  /** 分类/风险等级枚举下发（含风险说明文案，前端替代写死常量） */
  @Post('enums')
  @Perms('list')
  @ApiOperation({ summary: '技能分类/风险等级枚举' })
  enums() {
    return this.ok(this.service.listEnums());
  }

  /** 能力测试/试运行（转发鉴权头，目标接口守卫生效；敏感能力禁止测试；执行前过安全策略） */
  @Post('test')
  @Perms('test')
  @ApiOperation({ summary: '能力测试/试运行' })
  async test(
    @Body() dto: TestSkillCapabilityDto,
    @Admin('userId') userId: number,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ok(await this.testService.testCapability(dto, authorization, userId));
  }

  /**
   * 执行前安全策略校验（聊天前端在执行技能能力前调用）。
   * 仅需登录即可（不挂 @Perms）：这是运行时治理入口，非管理动作。
   */
  @Post('check')
  @ApiOperation({ summary: '执行前安全策略校验' })
  async check(@Body() dto: SkillCheckDto, @Admin('userId') userId: number) {
    return this.ok(await this.testService.checkPolicy(dto, userId));
  }

  /** 某技能的版本历史分页 */
  @Post('version/list')
  @Perms('list')
  @ApiOperation({ summary: '技能版本历史' })
  async versionList(@Body() query: SkillVersionQueryDto) {
    return this.ok(await this.versionService.listVersions(query.skillId, query.page, query.pageSize));
  }

  /** 回滚技能到指定历史版本 */
  @Post('version/rollback')
  @Perms('update')
  @ApiOperation({ summary: '回滚技能到历史版本' })
  async versionRollback(@Body() dto: RollbackSkillDto, @Admin('username') operator: string) {
    await this.versionService.rollback(dto.skillId, dto.versionId, operator);
    return this.ok();
  }

  /** 导出技能为可移植 JSON（ids 空则全部）。独立 export 权限点，与 import 对称，可分别授权。 */
  @Post('export')
  @Perms('export')
  @ApiOperation({ summary: '导出技能 JSON' })
  async exportSkills(@Body() dto: ExportSkillsDto) {
    return this.ok(await this.portService.exportSkills(dto.ids));
  }

  /**
   * 导入技能 JSON（校验能力合法性 + 冲突策略）。
   * 用独立 import 权限点：导入可 create 也可 overwrite（更新），比复用 add 更贴合语义、便于单独授权治理。
   */
  @Post('import')
  @Perms('import')
  @ApiOperation({ summary: '导入技能 JSON' })
  async importSkills(@Body() dto: ImportSkillsDto, @Admin('username') creator: string) {
    return this.ok(await this.portService.importSkills(dto.items, dto.conflictStrategy, creator));
  }

  /** 已启用技能的解析后工具定义（聊天前端注册用） */
  @Post('enabled')
  @Perms('enabled')
  @ApiOperation({ summary: '已启用技能的工具定义' })
  async enabled() {
    return this.ok(await this.service.resolveEnabledTools());
  }

  /** 新建技能 */
  @Post('add')
  @Perms('add')
  @ApiOperation({ summary: '新建技能' })
  async add(@Body() dto: CreateAgentSkillDto, @Admin('username') creator: string) {
    return this.ok(await this.service.createSkill(dto, creator));
  }

  /** 更新技能 */
  @Post('update')
  @Perms('update')
  @ApiOperation({ summary: '更新技能' })
  async update(@Body() dto: UpdateAgentSkillDto, @Admin('username') operator: string) {
    const { id, ...rest } = dto;
    await this.service.updateSkill(id, rest, operator);
    return this.ok();
  }

  /** 切换启用状态 */
  @Post('toggle')
  @Perms('toggle')
  @ApiOperation({ summary: '切换技能启用状态' })
  async toggle(@Body() dto: ToggleAgentSkillDto) {
    await this.service.toggle(dto.id, dto.enabled);
    return this.ok();
  }

  /** 删除技能 */
  @Post('delete')
  @Perms('delete')
  @ApiOperation({ summary: '删除技能' })
  async remove(@Body() dto: DeleteAgentSkillDto) {
    await this.service.remove(dto.id);
    return this.ok();
  }
}
