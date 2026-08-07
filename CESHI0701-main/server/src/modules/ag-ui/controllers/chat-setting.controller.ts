import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Admin } from '@/common/decorators';
import { SaveChatSettingDto } from '../dto/chat-setting.dto';
import { ChatSettingService } from '../services/chat-setting.service';

/**
 * 智能体聊天设置控制器
 *
 * 提供当前用户的聊天个人设置读写。走认证通道，@Admin('userId') 天然实现用户级隔离，
 * 用户只能读写自己的设置。
 */
@ApiTags('AG-UI 聊天设置')
@Controller('admin/ag-ui/setting')
export class ChatSettingController {
  constructor(private readonly chatSettingService: ChatSettingService) {}

  /** 获取当前用户的聊天设置（无记录返回默认值） */
  @Get()
  @ApiOperation({ summary: '获取当前用户的聊天设置' })
  async get(@Admin('userId') userId: number) {
    return this.chatSettingService.get(userId);
  }

  /** 保存/更新当前用户的聊天设置（与现有设置合并） */
  @Post()
  @ApiOperation({ summary: '保存当前用户的聊天设置' })
  async save(@Admin('userId') userId: number, @Body() body: SaveChatSettingDto) {
    return this.chatSettingService.save(userId, body);
  }
}
