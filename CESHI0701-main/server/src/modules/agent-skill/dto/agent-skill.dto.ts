import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  MaxLength,
  Matches,
  IsIn,
  IsObject,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SKILL_CATEGORY_VALUES, SKILL_RISK_VALUES } from '../catalog/agent-skill.enums';

/** 技能键校验：小写字母开头，仅含小写字母/数字/连字符 */
const SKILL_KEY_RULE = /^[a-z][a-z0-9-]*$/;
/** 触发关键词/适用智能体数组上限 */
const STRING_LIST_MAX = 30;

/** 新建技能入参 */
export class CreateAgentSkillDto {
  @ApiProperty({ description: '技能唯一键（kebab-case）' })
  @IsString()
  @MaxLength(64)
  @Matches(SKILL_KEY_RULE, { message: '技能键须为 kebab-case（小写字母开头，仅含小写字母/数字/连字符）' })
  skillKey: string;

  @ApiProperty({ description: '技能显示名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '技能描述', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '引用的能力目录 key 列表', type: [String] })
  @IsArray()
  @ArrayNotEmpty({ message: '至少选择一个能力' })
  @ArrayMaxSize(50, { message: '能力数量超出上限' })
  @IsString({ each: true })
  @MaxLength(64, { each: true, message: '能力 key 过长' })
  capabilities: string[];

  @ApiPropertyOptional({ description: '类型/分类', enum: SKILL_CATEGORY_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(SKILL_CATEGORY_VALUES as unknown as string[])
  category?: string;

  @ApiPropertyOptional({ description: '风险等级', enum: SKILL_RISK_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(SKILL_RISK_VALUES as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'CLI 绑定命令' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cliCommand?: string;

  @ApiPropertyOptional({ description: '触发关键词', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(STRING_LIST_MAX)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  triggerKeywords?: string[];

  @ApiPropertyOptional({ description: '适用智能体', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(STRING_LIST_MAX)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  applicableAgents?: string[];

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '排序值', required: false })
  @IsOptional()
  @IsInt()
  sort?: number;
}

/** 更新技能入参 */
export class UpdateAgentSkillDto {
  @ApiProperty({ description: '技能主键 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '技能显示名称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: '技能描述', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '引用的能力目录 key 列表', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: '至少选择一个能力' })
  @ArrayMaxSize(50, { message: '能力数量超出上限' })
  @IsString({ each: true })
  @MaxLength(64, { each: true, message: '能力 key 过长' })
  capabilities?: string[];

  @ApiPropertyOptional({ description: '类型/分类', enum: SKILL_CATEGORY_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(SKILL_CATEGORY_VALUES as unknown as string[])
  category?: string;

  @ApiPropertyOptional({ description: '风险等级', enum: SKILL_RISK_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(SKILL_RISK_VALUES as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'CLI 绑定命令' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cliCommand?: string;

  @ApiPropertyOptional({ description: '触发关键词', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(STRING_LIST_MAX)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  triggerKeywords?: string[];

  @ApiPropertyOptional({ description: '适用智能体', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(STRING_LIST_MAX)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  applicableAgents?: string[];

  @ApiProperty({ description: '排序值', required: false })
  @IsOptional()
  @IsInt()
  sort?: number;
}

/** 切换技能启用状态入参 */
export class ToggleAgentSkillDto {
  @ApiProperty({ description: '技能主键 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '目标启用状态' })
  @IsBoolean()
  enabled: boolean;
}

/** 删除技能入参 */
export class DeleteAgentSkillDto {
  @ApiProperty({ description: '技能主键 ID' })
  @IsInt()
  id: number;
}

/** 技能列表查询入参（筛选 + 分页） */
export class SkillListQueryDto {
  @ApiPropertyOptional({ description: '关键词（名称/描述模糊匹配）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: '类型/分类', enum: SKILL_CATEGORY_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(SKILL_CATEGORY_VALUES as unknown as string[])
  category?: string;

  @ApiPropertyOptional({ description: '风险等级', enum: SKILL_RISK_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(SKILL_RISK_VALUES as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: '状态：1=启用 0=禁用（不传为全部）' })
  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @ApiPropertyOptional({ description: '适用智能体（精确匹配数组内元素）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  applicableAgent?: string;

  @ApiPropertyOptional({ description: '页码（从 1 起，默认 1）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数（默认 10）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

/** 能力测试/试运行入参（管理台在配置页验证某能力是否可调用） */
export class TestSkillCapabilityDto {
  @ApiProperty({ description: '技能主键 ID' })
  @IsInt()
  skillId: number;

  @ApiProperty({ description: '被测试的能力 key（须属于该技能）' })
  @IsString()
  @MaxLength(64)
  capabilityKey: string;

  @ApiPropertyOptional({ description: '测试调用参数（对象，按能力 parameters schema）' })
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}

/** 运行日志记录入参（聊天前端埋点写入） */
export class RecordSkillRunDto {
  @ApiProperty({ description: '被调用的能力 key（capability key）' })
  @IsString()
  @MaxLength(64)
  capabilityKey: string;

  @ApiProperty({ description: '是否成功' })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({ description: '耗时（毫秒）' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @ApiPropertyOptional({ description: '失败错误信息' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  errorMsg?: string;
}

/** 版本历史查询入参（某技能的版本分页） */
export class SkillVersionQueryDto {
  @ApiProperty({ description: '技能主键 ID' })
  @IsInt()
  skillId: number;

  @ApiPropertyOptional({ description: '页码（从 1 起，默认 1）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数（默认 10）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

/** 回滚技能到历史版本入参 */
export class RollbackSkillDto {
  @ApiProperty({ description: '技能主键 ID' })
  @IsInt()
  skillId: number;

  @ApiProperty({ description: '目标历史版本记录 ID' })
  @IsInt()
  versionId: number;
}

/** 执行前安全策略校验入参 */
export class SkillCheckDto {
  @ApiProperty({ description: '技能唯一键' })
  @IsString()
  @MaxLength(64)
  skillKey: string;

  @ApiPropertyOptional({ description: '拟调用的能力 key' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  capabilityKey?: string;

  @ApiPropertyOptional({ description: '调用载荷（含 command/sql/filePath 等，供危险内容检测）' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/** 导出技能入参（ids 空则导出全部） */
export class ExportSkillsDto {
  @ApiPropertyOptional({ description: '要导出的技能 ID 列表（空则导出全部）', type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  ids?: number[];
}

/** 单个导入技能项（可移植字段，不含 id/creator/运行统计/tenantId） */
export class SkillImportItem {
  @ApiProperty({ description: '技能唯一键（kebab-case）' })
  @IsString()
  @MaxLength(64)
  @Matches(SKILL_KEY_RULE, { message: '技能键须为 kebab-case' })
  skillKey: string;

  @ApiProperty({ description: '技能显示名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '技能描述' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '引用的能力目录 key 列表', type: [String] })
  @IsArray()
  @ArrayNotEmpty({ message: '至少一个能力' })
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  capabilities: string[];

  @ApiPropertyOptional({ description: '类型/分类', enum: SKILL_CATEGORY_VALUES })
  @IsOptional()
  @IsIn(SKILL_CATEGORY_VALUES as unknown as string[])
  category?: string;

  @ApiPropertyOptional({ description: '风险等级', enum: SKILL_RISK_VALUES })
  @IsOptional()
  @IsIn(SKILL_RISK_VALUES as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'CLI 绑定命令' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cliCommand?: string;

  @ApiPropertyOptional({ description: '触发关键词', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(STRING_LIST_MAX)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  triggerKeywords?: string[];

  @ApiPropertyOptional({ description: '适用智能体', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(STRING_LIST_MAX)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  applicableAgents?: string[];

  @ApiPropertyOptional({ description: '排序值' })
  @IsOptional()
  @IsInt()
  sort?: number;
}

/** 导入技能入参（含冲突策略） */
export class ImportSkillsDto {
  @ApiProperty({ description: '待导入技能项', type: [SkillImportItem] })
  @IsArray()
  @ArrayNotEmpty({ message: '导入项不能为空' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SkillImportItem)
  items: SkillImportItem[];

  @ApiPropertyOptional({
    description: '冲突策略：skip 跳过 / overwrite 覆盖 / rename 重命名',
    enum: ['skip', 'overwrite', 'rename'],
  })
  @IsOptional()
  @IsIn(['skip', 'overwrite', 'rename'])
  conflictStrategy?: 'skip' | 'overwrite' | 'rename';
}

/** 运行日志查询入参（某技能的日志分页） */
export class SkillRunLogQueryDto {
  @ApiProperty({ description: '技能主键 ID' })
  @IsInt()
  skillId: number;

  @ApiPropertyOptional({ description: '按结果筛选：true=仅成功 false=仅失败（不传为全部）' })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({ description: '页码（从 1 起，默认 1）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数（默认 10）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
