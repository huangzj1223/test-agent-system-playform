import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  Matches,
  MaxLength,
  IsNotEmpty,
  IsInt,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MEMORY_CATEGORY_VALUES,
  MEMORY_RISK_VALUES,
} from '../catalog/agent-memory.enums';

/**
 * 记忆中心 DTO 集合
 *
 * 阶段 1 仅含读取相关（列表筛选/详情）；写入相关 DTO 在后续阶段追加。
 */

/** 记忆文件列表筛选查询 */
export class MemoryListQueryDto {
  @ApiProperty({ description: '关键字（名称/描述模糊匹配）', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '分类筛选', required: false, enum: MEMORY_CATEGORY_VALUES })
  @IsOptional()
  @IsIn(MEMORY_CATEGORY_VALUES as unknown as string[])
  category?: string;

  @ApiProperty({ description: '风险等级筛选', required: false, enum: MEMORY_RISK_VALUES })
  @IsOptional()
  @IsIn(MEMORY_RISK_VALUES as unknown as string[])
  riskLevel?: string;

  @ApiProperty({ description: '启用状态筛选', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/** 记忆文件详情查询（按 memoryKey） */
export class MemoryDetailDto {
  @ApiProperty({ description: '记忆文件唯一键，如 soul.md' })
  @IsString()
  memoryKey!: string;
}

/** 新建记忆文件 */
export class CreateMemoryDto {
  @ApiProperty({ description: '记忆文件唯一键（须以 .md 结尾，字母/数字/-/_ 组合）' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+\.md$/, { message: 'memoryKey 须为字母/数字/-/_ 且以 .md 结尾' })
  memoryKey!: string;

  @ApiProperty({ description: '文件名（缺省用 memoryKey）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: '简短描述', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ description: 'Markdown 内容', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100000, { message: '记忆内容长度不能超过 100000 字符' })
  content?: string;

  @ApiProperty({ description: '分类', required: false, enum: MEMORY_CATEGORY_VALUES })
  @IsOptional()
  @IsIn(MEMORY_CATEGORY_VALUES as unknown as string[])
  category?: string;

  @ApiProperty({ description: '风险等级', required: false, enum: MEMORY_RISK_VALUES })
  @IsOptional()
  @IsIn(MEMORY_RISK_VALUES as unknown as string[])
  riskLevel?: string;

  @ApiProperty({ description: '已人工二次确认（安全策略命中时须为 true 才放行）', required: false })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

/** 保存记忆文件内容 */
export class SaveMemoryContentDto {
  @ApiProperty({ description: '记忆文件唯一键' })
  @IsString()
  memoryKey!: string;

  @ApiProperty({ description: '新的 Markdown 内容' })
  @IsString()
  @MaxLength(100000, { message: '记忆内容长度不能超过 100000 字符' })
  content!: string;

  @ApiProperty({ description: '已人工二次确认（needConfirm 命中时须为 true 才放行）', required: false })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

/** 单条读取埋点项 */
export class ReadLogItemDto {
  @ApiProperty({ description: '被读取记忆文件 key', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  memoryKey?: string;

  @ApiProperty({ description: '是否命中（记忆被实际注入）', required: false })
  @IsOptional()
  @IsBoolean()
  hit?: boolean;

  @ApiProperty({ description: '对话会话标识', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;
}

/** 批量记录记忆读取埋点 */
export class RecordReadDto {
  @ApiProperty({ description: '读取项列表', type: [ReadLogItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReadLogItemDto)
  items!: ReadLogItemDto[];
}

/** 记忆写入前安全裁决预判 */
export class CheckMemoryWriteDto {
  @ApiProperty({ description: '记忆文件唯一键' })
  @IsString()
  memoryKey!: string;

  @ApiProperty({ description: '拟写入内容（用于敏感词检测）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  text?: string;
}

/** 更新记忆文件权限（局部 patch） */
export class UpdateMemoryPermissionDto {
  @ApiProperty({ description: '记忆文件唯一键' })
  @IsString()
  memoryKey!: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: '允许模型读取', required: false })
  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @ApiProperty({ description: '允许模型建议修改', required: false })
  @IsOptional()
  @IsBoolean()
  canSuggest?: boolean;

  @ApiProperty({ description: '允许低风险自动写入', required: false })
  @IsOptional()
  @IsBoolean()
  canAutoWrite?: boolean;

  @ApiProperty({ description: '高风险写入需人工确认', required: false })
  @IsOptional()
  @IsBoolean()
  needConfirm?: boolean;

  @ApiProperty({ description: '记录审计日志', required: false })
  @IsOptional()
  @IsBoolean()
  auditLog?: boolean;
}

/** 启用/停用记忆文件 */
export class ToggleMemoryDto {
  @ApiProperty({ description: '记忆文件唯一键' })
  @IsString()
  memoryKey!: string;

  @ApiProperty({ description: '目标启用状态' })
  @IsBoolean()
  enabled!: boolean;
}

/** 删除记忆文件 */
export class DeleteMemoryDto {
  @ApiProperty({ description: '记忆文件唯一键' })
  @IsString()
  memoryKey!: string;
}

/** 版本历史查询 */
export class MemoryVersionQueryDto {
  @ApiProperty({ description: '记忆文件唯一键' })
  @IsString()
  memoryKey!: string;

  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: '每页条数', required: false })
  @IsOptional()
  pageSize?: number;
}

/** 回滚到指定版本 */
export class RollbackMemoryDto {
  @ApiProperty({ description: '记忆文件唯一键' })
  @IsString()
  memoryKey!: string;

  @ApiProperty({ description: '目标版本号，如 v1.2.0' })
  @IsString()
  version!: string;

  @ApiProperty({ description: '已人工二次确认（安全策略命中时须为 true 才放行）', required: false })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

/** 确认待确认记忆 */
export class ConfirmPendingDto {
  @ApiProperty({ description: '待确认记忆 ID' })
  @IsInt()
  id!: number;

  @ApiProperty({ description: '可选覆盖文本（编辑后确认）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  text?: string;

  @ApiProperty({ description: '已人工二次确认（needConfirm 命中时须为 true 才放行）', required: false })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

/** 忽略待确认记忆 */
export class IgnorePendingDto {
  @ApiProperty({ description: '待确认记忆 ID' })
  @IsInt()
  id!: number;
}

/**
 * 新建待确认记忆（对话侧智能体调用 memory.suggest 工具时提交）
 * 仅入队 status=pending，不改动任何文件；真正写入在管理员 confirm 时才发生（届时过 enforceWrite）。
 */
export class CreatePendingDto {
  @ApiProperty({ description: '建议记忆内容（一句话事实/偏好）' })
  @IsString()
  @IsNotEmpty({ message: '建议内容不能为空' })
  @MaxLength(1000, { message: '建议内容长度不能超过 1000 字符' })
  text!: string;

  @ApiProperty({ description: '建议写入的目标记忆文件 key（如 user.md），须以 .md 结尾' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+\.md$/, { message: 'targetKey 须为字母/数字/-/_ 且以 .md 结尾' })
  targetKey!: string;

  @ApiProperty({ description: '来源说明（如"来自对话：用户自述身份"）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  source?: string;
}

/** 模型建议列表查询 */
export class SuggestionListDto {
  @ApiProperty({ description: '记忆文件唯一键' })
  @IsString()
  memoryKey!: string;
}

/** 应用模型建议 */
export class ApplySuggestionDto {
  @ApiProperty({ description: '模型建议 ID' })
  @IsInt()
  id!: number;

  @ApiProperty({ description: '可选覆盖文本（编辑后应用）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  text?: string;

  @ApiProperty({ description: '已人工二次确认（needConfirm 命中时须为 true 才放行）', required: false })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

/** 忽略模型建议 */
export class IgnoreSuggestionDto {
  @ApiProperty({ description: '模型建议 ID' })
  @IsInt()
  id!: number;
}
