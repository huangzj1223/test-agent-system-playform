import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  MaxLength,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RISK_LEVELS,
  DEFAULT_ACTIONS,
  APPROVAL_MODES,
  TIMEOUT_ACTIONS,
  SENSITIVE_ACTIONS,
  LIST_TYPES,
} from '../catalog/security-policy.enums';

/* ---------- 风险等级 ---------- */

/** 保存风险等级入参（按 level upsert） */
export class SaveRiskPolicyDto {
  @ApiProperty({ description: '风险等级', enum: RISK_LEVELS })
  @IsString()
  @IsIn(RISK_LEVELS as unknown as string[])
  level: string;

  @ApiProperty({ description: '等级名称' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: '说明' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '示例操作', type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  examples: string[];

  @ApiPropertyOptional({ description: '审批要求文案' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  approvalRequirement?: string;

  @ApiProperty({ description: '默认行为', enum: DEFAULT_ACTIONS })
  @IsString()
  @IsIn(DEFAULT_ACTIONS as unknown as string[])
  defaultAction: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '排序值' })
  @IsOptional()
  @IsInt()
  sort?: number;
}

/** 删除风险等级入参 */
export class DeleteRiskPolicyDto {
  @ApiProperty({ description: '风险等级 level' })
  @IsString()
  @IsIn(RISK_LEVELS as unknown as string[])
  level: string;
}

/* ---------- 审批规则 ---------- */

/** 新建审批规则入参 */
export class CreateApprovalRuleDto {
  @ApiProperty({ description: '规则名称' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '适用范围' })
  @IsString()
  @MaxLength(50)
  scope: string;

  @ApiProperty({ description: '适用风险等级', type: [String], enum: RISK_LEVELS })
  @IsArray()
  @ArrayNotEmpty({ message: '至少选择一个风险等级' })
  @ArrayMaxSize(4)
  @IsIn(RISK_LEVELS as unknown as string[], { each: true })
  riskLevels: string[];

  @ApiProperty({ description: '审批方式', enum: APPROVAL_MODES })
  @IsString()
  @IsIn(APPROVAL_MODES as unknown as string[])
  approvalMode: string;

  @ApiProperty({ description: '审批人 / 角色' })
  @IsString()
  @MaxLength(100)
  approverRole: string;

  @ApiPropertyOptional({ description: '审批超时时间（分钟）' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeoutMinutes?: number;

  @ApiProperty({ description: '超时处理', enum: TIMEOUT_ACTIONS })
  @IsString()
  @IsIn(TIMEOUT_ACTIONS as unknown as string[])
  timeoutAction: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '排序值' })
  @IsOptional()
  @IsInt()
  sort?: number;
}

/** 更新审批规则入参 */
export class UpdateApprovalRuleDto extends CreateApprovalRuleDto {
  @ApiProperty({ description: '规则主键 ID' })
  @IsInt()
  id: number;
}

/** 切换审批规则启用状态 */
export class ToggleDto {
  @ApiProperty({ description: '主键 ID' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '目标启用状态' })
  @IsBoolean()
  enabled: boolean;
}

/** 通用主键删除入参 */
export class IdDto {
  @ApiProperty({ description: '主键 ID' })
  @IsInt()
  id: number;
}

/* ---------- 黑白名单 ---------- */

/** 按名单类型查询 */
export class ListQueryDto {
  @ApiProperty({ description: '名单类型', enum: LIST_TYPES })
  @IsString()
  @IsIn(LIST_TYPES as unknown as string[])
  listType: string;
}

/** 新建名单条目入参 */
export class CreateListItemDto {
  @ApiProperty({ description: '名单类型', enum: LIST_TYPES })
  @IsString()
  @IsIn(LIST_TYPES as unknown as string[])
  listType: string;

  @ApiProperty({ description: '内容（命令模板 / 目录 / API 路径 / 表字段）' })
  @IsString()
  @MaxLength(300)
  value: string;

  @ApiPropertyOptional({ description: '说明' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ description: '风险等级', enum: RISK_LEVELS })
  @IsOptional()
  @IsString()
  @IsIn(RISK_LEVELS as unknown as string[])
  riskLevel?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '排序值' })
  @IsOptional()
  @IsInt()
  sort?: number;
}

/** 更新名单条目入参 */
export class UpdateListItemDto extends CreateListItemDto {
  @ApiProperty({ description: '条目主键 ID' })
  @IsInt()
  id: number;
}

/* ---------- 敏感词 ---------- */

/** 新建敏感词规则入参 */
export class CreateSensitiveRuleDto {
  @ApiProperty({ description: '敏感类型' })
  @IsString()
  @MaxLength(50)
  type: string;

  @ApiProperty({ description: '匹配规则（多个用 / 分隔）' })
  @IsString()
  @MaxLength(300)
  pattern: string;

  @ApiProperty({ description: '处理方式', enum: SENSITIVE_ACTIONS })
  @IsString()
  @IsIn(SENSITIVE_ACTIONS as unknown as string[])
  action: string;

  @ApiProperty({ description: '适用范围', type: [String] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  scopes: string[];

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '排序值' })
  @IsOptional()
  @IsInt()
  sort?: number;
}

/** 更新敏感词规则入参 */
export class UpdateSensitiveRuleDto extends CreateSensitiveRuleDto {
  @ApiProperty({ description: '规则主键 ID' })
  @IsInt()
  id: number;
}

