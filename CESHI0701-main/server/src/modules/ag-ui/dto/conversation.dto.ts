import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** 单条消息文本上限（防止单条超大内容撑爆文件） */
const MESSAGE_CONTENT_MAX = 50000;
/** 单个会话消息条数上限 */
const MESSAGES_MAX = 500;

/**
 * 会话消息（用于持久化的最小结构，与前端 AiChatMessage 对齐）
 * 仅存已完成的 user/assistant 消息，运行态产物（工具/步骤/推理）不落盘。
 */
export class ConversationMessageDto {
  @ApiProperty({ description: '消息 ID' })
  @IsString()
  @MaxLength(128)
  id: string;

  @ApiProperty({ description: '角色（user / assistant）' })
  @IsString()
  @MaxLength(32)
  role: string;

  @ApiProperty({ description: '文本内容（Markdown）' })
  @IsString()
  @MaxLength(MESSAGE_CONTENT_MAX)
  content: string;

  @ApiPropertyOptional({ description: '创建时间戳（毫秒）' })
  @IsOptional()
  @IsInt()
  createdAt?: number;

  @ApiPropertyOptional({ description: '结构化消息块（表格/图表/代码/错误）' })
  @IsOptional()
  @IsArray()
  blocks?: unknown[];
}

/**
 * 保存会话入参（upsert：按 threadId 覆盖）
 */
export class SaveConversationDto {
  @ApiProperty({ description: '会话线程 ID' })
  @IsString()
  @MaxLength(128)
  threadId: string;

  @ApiProperty({ description: '会话标题' })
  @IsString()
  @MaxLength(64)
  title: string;

  @ApiProperty({ description: '会话消息列表', type: [ConversationMessageDto] })
  @IsArray()
  @ArrayMaxSize(MESSAGES_MAX)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  messages: ConversationMessageDto[];

  @ApiPropertyOptional({ description: '创建时间戳（毫秒）' })
  @IsOptional()
  @IsInt()
  createdAt?: number;
}
