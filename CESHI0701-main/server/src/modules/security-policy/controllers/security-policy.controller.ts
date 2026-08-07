import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BaseController } from '@/common/crud';
import { Perms } from '@/common/decorators';
import { SecurityPolicyService } from '../services/security-policy.service';
import { SecurityCheckService } from '../services/security-check.service';
import { ApprovalRequestService } from '../services/approval-request.service';
import { Admin } from '@/common/decorators';
import { SecurityCheckDto, AuditLogQueryDto } from '../dto/security-check.dto';
import { ApprovalRequestQueryDto, ApprovalDecideDto } from '../dto/approval-request.dto';
import {
  SaveRiskPolicyDto,
  DeleteRiskPolicyDto,
  CreateApprovalRuleDto,
  UpdateApprovalRuleDto,
  ToggleDto,
  IdDto,
  ListQueryDto,
  CreateListItemDto,
  UpdateListItemDto,
  CreateSensitiveRuleDto,
  UpdateSensitiveRuleDto,
} from '../dto/security-policy.dto';
import { SaveGlobalPolicyDto, SaveSandboxPolicyDto, SaveAuditPolicyDto } from '../dto/security-config.dto';

/**
 * 安全策略管理接口
 *
 * 前缀 admin/security-policy，走 admin 鉴权体系 + 权限点（security-policy:*）。
 * 统一管理智能体执行 Skills / 调用 CLI / 访问数据库 / 操作页面 / 写文件 / 更新记忆时的安全边界。
 */
@ApiTags('安全策略')
@Controller('admin/security-policy')
export class SecurityPolicyController extends BaseController {
  constructor(
    private readonly service: SecurityPolicyService,
    private readonly checkService: SecurityCheckService,
    private readonly approvalService: ApprovalRequestService,
  ) {
    super();
  }

  /** 概览：一次拉取全部安全策略数据 */
  @Post('overview')
  @Perms('list')
  @ApiOperation({ summary: '安全策略概览' })
  async overview() {
    return this.ok(await this.service.overview());
  }

  /* ---------- 风险等级 ---------- */

  @Post('risk/list')
  @Perms('list')
  @ApiOperation({ summary: '风险等级列表' })
  async riskList() {
    return this.ok(await this.service.listRisk());
  }

  @Post('risk/save')
  @Perms('save')
  @ApiOperation({ summary: '保存风险等级' })
  async riskSave(@Body() dto: SaveRiskPolicyDto) {
    await this.service.saveRisk(dto);
    return this.ok();
  }

  @Post('risk/delete')
  @Perms('delete')
  @ApiOperation({ summary: '删除风险等级' })
  async riskDelete(@Body() dto: DeleteRiskPolicyDto) {
    await this.service.deleteRisk(dto.level);
    return this.ok();
  }

  /* ---------- 审批规则 ---------- */

  @Post('approval/list')
  @Perms('list')
  @ApiOperation({ summary: '审批规则列表' })
  async approvalList() {
    return this.ok(await this.service.listApproval());
  }

  @Post('approval/add')
  @Perms('add')
  @ApiOperation({ summary: '新建审批规则' })
  async approvalAdd(@Body() dto: CreateApprovalRuleDto) {
    return this.ok(await this.service.addApproval(dto));
  }

  @Post('approval/update')
  @Perms('update')
  @ApiOperation({ summary: '更新审批规则' })
  async approvalUpdate(@Body() dto: UpdateApprovalRuleDto) {
    const { id, ...rest } = dto;
    await this.service.updateApproval(id, rest);
    return this.ok();
  }

  @Post('approval/toggle')
  @Perms('update')
  @ApiOperation({ summary: '切换审批规则状态' })
  async approvalToggle(@Body() dto: ToggleDto) {
    await this.service.toggleApproval(dto.id, dto.enabled);
    return this.ok();
  }

  @Post('approval/delete')
  @Perms('delete')
  @ApiOperation({ summary: '删除审批规则' })
  async approvalDelete(@Body() dto: IdDto) {
    await this.service.deleteApproval(dto.id);
    return this.ok();
  }

  /* ---------- 黑白名单 ---------- */

  @Post('list/query')
  @Perms('list')
  @ApiOperation({ summary: '按类型查询黑白名单' })
  async listQuery(@Body() dto: ListQueryDto) {
    return this.ok(await this.service.listByType(dto.listType));
  }

  @Post('list/add')
  @Perms('add')
  @ApiOperation({ summary: '新建名单条目' })
  async listAdd(@Body() dto: CreateListItemDto) {
    return this.ok(await this.service.addListItem(dto));
  }

  @Post('list/update')
  @Perms('update')
  @ApiOperation({ summary: '更新名单条目' })
  async listUpdate(@Body() dto: UpdateListItemDto) {
    const { id, ...rest } = dto;
    await this.service.updateListItem(id, rest);
    return this.ok();
  }

  @Post('list/toggle')
  @Perms('update')
  @ApiOperation({ summary: '切换名单条目状态' })
  async listToggle(@Body() dto: ToggleDto) {
    await this.service.toggleListItem(dto.id, dto.enabled);
    return this.ok();
  }

  @Post('list/delete')
  @Perms('delete')
  @ApiOperation({ summary: '删除名单条目' })
  async listDelete(@Body() dto: IdDto) {
    await this.service.deleteListItem(dto.id);
    return this.ok();
  }

  /* ---------- 敏感词 ---------- */

  @Post('sensitive/list')
  @Perms('list')
  @ApiOperation({ summary: '敏感词列表' })
  async sensitiveList() {
    return this.ok(await this.service.listSensitive());
  }

  @Post('sensitive/stats')
  @Perms('list')
  @ApiOperation({ summary: '敏感词统计' })
  async sensitiveStats() {
    return this.ok(await this.service.sensitiveStats());
  }

  @Post('sensitive/add')
  @Perms('add')
  @ApiOperation({ summary: '新建敏感词规则' })
  async sensitiveAdd(@Body() dto: CreateSensitiveRuleDto) {
    return this.ok(await this.service.addSensitive(dto));
  }

  @Post('sensitive/update')
  @Perms('update')
  @ApiOperation({ summary: '更新敏感词规则' })
  async sensitiveUpdate(@Body() dto: UpdateSensitiveRuleDto) {
    const { id, ...rest } = dto;
    await this.service.updateSensitive(id, rest);
    return this.ok();
  }

  @Post('sensitive/toggle')
  @Perms('update')
  @ApiOperation({ summary: '切换敏感词规则状态' })
  async sensitiveToggle(@Body() dto: ToggleDto) {
    await this.service.toggleSensitive(dto.id, dto.enabled);
    return this.ok();
  }

  @Post('sensitive/delete')
  @Perms('delete')
  @ApiOperation({ summary: '删除敏感词规则' })
  async sensitiveDelete(@Body() dto: IdDto) {
    await this.service.deleteSensitive(dto.id);
    return this.ok();
  }

  /* ---------- 全局 / 沙箱 / 审计 ---------- */

  @Post('global/get')
  @Perms('list')
  @ApiOperation({ summary: '读取全局策略' })
  async globalGet() {
    return this.ok(await this.service.getGlobal());
  }

  @Post('global/save')
  @Perms('save')
  @ApiOperation({ summary: '保存全局策略' })
  async globalSave(@Body() dto: SaveGlobalPolicyDto) {
    return this.ok(await this.service.saveGlobal(dto.settings));
  }

  @Post('sandbox/get')
  @Perms('list')
  @ApiOperation({ summary: '读取沙箱策略' })
  async sandboxGet() {
    return this.ok(await this.service.getSandbox());
  }

  @Post('sandbox/save')
  @Perms('save')
  @ApiOperation({ summary: '保存沙箱策略' })
  async sandboxSave(@Body() dto: SaveSandboxPolicyDto) {
    return this.ok(await this.service.saveSandbox(dto.settings));
  }

  @Post('audit/get')
  @Perms('list')
  @ApiOperation({ summary: '读取审计策略' })
  async auditGet() {
    return this.ok(await this.service.getAudit());
  }

  @Post('audit/save')
  @Perms('save')
  @ApiOperation({ summary: '保存审计策略' })
  async auditSave(@Body() dto: SaveAuditPolicyDto) {
    return this.ok(await this.service.saveAudit(dto.settings));
  }

  /* ---------- 统一校验 + 审计日志 ---------- */

  /**
   * 统一安全校验入口（Skills 执行前 / 工具调用前 / 记忆写入前调用）。
   * 仅需登录即可调用（不声明 @Perms），校验本身是运行时防护。
   */
  @Post('check')
  @ApiOperation({ summary: '统一安全策略校验' })
  async check(@Body() dto: SecurityCheckDto, @Admin('userId') userId: number) {
    return this.ok(await this.checkService.check(dto, userId));
  }

  @Post('audit-log/list')
  @Perms('list')
  @ApiOperation({ summary: '审计日志列表' })
  async auditLogList(@Body() dto: AuditLogQueryDto) {
    return this.ok(await this.checkService.auditLogList(dto));
  }

  /* ---------- 审批工单 ---------- */

  @Post('approval-request/list')
  @Perms('list')
  @ApiOperation({ summary: '审批工单列表' })
  async approvalRequestList(@Body() dto: ApprovalRequestQueryDto) {
    return this.ok(await this.approvalService.listRequest(dto));
  }

  @Post('approval-request/decide')
  @Perms('approve')
  @ApiOperation({ summary: '审批决策（通过/拒绝）' })
  async approvalRequestDecide(@Body() dto: ApprovalDecideDto, @Admin('userId') userId: number) {
    await this.approvalService.decide(dto.id, dto.decision as 'approved' | 'rejected', userId, dto.remark);
    return this.ok();
  }

  @Post('approval-request/timeout-scan')
  @Perms('approve')
  @ApiOperation({ summary: '审批工单超时扫描' })
  async approvalRequestTimeoutScan() {
    return this.ok(await this.approvalService.checkTimeout());
  }
}
