import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// 以下为 DTO 层「防御性硬上限」——仅用于挡超大 payload（DoS 防护）。
// 装饰器是编译期静态值，读不了数据库；真实业务限制由全局配置（SysAgentConfig）在
// ChatSettingService.assertWithinLimits 运行时校验。故此处取值须显著宽于任何合理配置，
// 避免运维调高配置后被 DTO 提前拒绝。
/** 系统提示词防御性硬上限 */
const SYSTEM_PROMPT_MAX = 20000;
/** 提示词模板条数防御性硬上限 */
const TEMPLATE_MAX_COUNT = 500;
/** 单条模板内容防御性硬上限 */
const TEMPLATE_CONTENT_MAX = 10000;
/** 单条模板标题防御性硬上限 */
const TEMPLATE_TITLE_MAX = 200;
/** 字号可选值 */
export const FONT_SIZE_VALUES = ['small', 'medium', 'large'] as const;
/** 密度可选值 */
export const DENSITY_VALUES = ['compact', 'comfortable'] as const;

/** 对话参数：控制模型生成行为 */
export class ChatParamsDto {
  // null 表示"清除该字段、恢复模型默认"（@IsOptional 对 null 同样跳过后续校验器）；
  // undefined（键不存在）表示"本次不改动该字段"。二者语义不同，见 ChatSettingService.save。
  @ApiPropertyOptional({ description: '采样温度（0-2）；null 表示恢复模型默认' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number | null;

  @ApiPropertyOptional({ description: '最大输出 token 数（正整数）；null 表示恢复模型默认' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTokens?: number | null;

  @ApiPropertyOptional({ description: '系统提示词' })
  @IsOptional()
  @IsString()
  @MaxLength(SYSTEM_PROMPT_MAX)
  systemPrompt?: string;
}

/** 界面偏好：控制聊天窗口展示 */
export class UiPrefsDto {
  @ApiPropertyOptional({ description: '消息字号', enum: FONT_SIZE_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(FONT_SIZE_VALUES as unknown as string[])
  fontSize?: string;

  @ApiPropertyOptional({ description: '消息密度', enum: DENSITY_VALUES })
  @IsOptional()
  @IsString()
  @IsIn(DENSITY_VALUES as unknown as string[])
  density?: string;

  @ApiPropertyOptional({ description: '是否显示推理过程' })
  @IsOptional()
  @IsBoolean()
  showReasoning?: boolean;

  @ApiPropertyOptional({ description: '是否显示工具调用卡片' })
  @IsOptional()
  @IsBoolean()
  showToolCalls?: boolean;
}

/** 当前主用模型选择：两个正整数 ID 定位到具体模型 */
export class CurrentModelDto {
  @ApiProperty({ description: '供应商配置 ID' })
  @IsInt()
  @Min(1)
  providerConfigId: number;

  @ApiProperty({ description: '模型主键 ID' })
  @IsInt()
  @Min(1)
  modelId: number;
}

/** 单条快捷提示词模板 */
export class PromptTemplateDto {
  @ApiProperty({ description: '模板 ID（前端生成）' })
  @IsString()
  @MaxLength(64)
  id: string;

  @ApiProperty({ description: '模板标题' })
  @IsString()
  @MaxLength(TEMPLATE_TITLE_MAX)
  title: string;

  @ApiProperty({ description: '模板内容（插入输入框的文本）' })
  @IsString()
  @MaxLength(TEMPLATE_CONTENT_MAX)
  content: string;
}

/**
 * 保存智能体聊天设置入参（整体覆盖：三部分均为可选，缺省保持后端默认）
 */
export class SaveChatSettingDto {
  @ApiPropertyOptional({ description: '对话参数', type: ChatParamsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatParamsDto)
  chatParams?: ChatParamsDto;

  @ApiPropertyOptional({ description: '界面偏好', type: UiPrefsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UiPrefsDto)
  uiPrefs?: UiPrefsDto;

  @ApiPropertyOptional({ description: '快捷提示词模板列表', type: [PromptTemplateDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(TEMPLATE_MAX_COUNT)
  @ValidateNested({ each: true })
  @Type(() => PromptTemplateDto)
  promptTemplates?: PromptTemplateDto[];

  // currentModel 三态：键缺省=保持原值；显式 null=清除选择；对象=更新。
  // @IsOptional 对 null 与 undefined 均跳过嵌套校验，故传 null 合法（service 归一为清除）。
  @ApiPropertyOptional({ description: '当前主用模型选择；null 表示清除', type: CurrentModelDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CurrentModelDto)
  currentModel?: CurrentModelDto | null;
}
