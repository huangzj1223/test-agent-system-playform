import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Admin } from '@/common/decorators';
import { SaveConversationDto } from '../dto/conversation.dto';
import { ConversationService } from '../services/conversation.service';

/**
 * AG-UI 会话历史控制器
 *
 * 提供智能体对话历史的持久化接口，会话以 Markdown 文件按用户隔离存储。
 * 走认证通道（默认经全局 AuthGuard），通过 @Admin('userId') 获取当前用户，
 * 实现天然的用户级会话隔离。
 */
@ApiTags('AG-UI 会话历史')
@Controller('admin/ag-ui/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /** 会话列表（仅元数据，按更新时间倒序） */
  @Get('list')
  @ApiOperation({ summary: '获取当前用户的会话历史列表' })
  async list(@Admin('userId') userId: number) {
    return this.conversationService.list(userId);
  }

  /** 单个会话完整内容（含消息） */
  @Get('info/:threadId')
  @ApiOperation({ summary: '获取单个会话完整内容' })
  async info(@Admin('userId') userId: number, @Param('threadId') threadId: string) {
    return this.conversationService.get(userId, threadId);
  }

  /** 保存/更新会话（upsert） */
  @Post('save')
  @ApiOperation({ summary: '保存或更新会话' })
  async save(@Admin('userId') userId: number, @Body() body: SaveConversationDto) {
    return this.conversationService.save(userId, body);
  }

  /** 删除会话 */
  @Delete('delete/:threadId')
  @ApiOperation({ summary: '删除会话' })
  async remove(@Admin('userId') userId: number, @Param('threadId') threadId: string) {
    await this.conversationService.remove(userId, threadId);
    return { success: true };
  }

  /** 清空当前用户的全部会话历史 */
  @Delete('clear')
  @ApiOperation({ summary: '清空当前用户的全部会话历史' })
  async clear(@Admin('userId') userId: number) {
    const removed = await this.conversationService.clear(userId);
    return { success: true, removed };
  }
}
