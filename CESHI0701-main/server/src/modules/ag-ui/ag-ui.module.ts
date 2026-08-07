import { Module } from '@nestjs/common';
import { AgUiController } from './controllers/ag-ui.controller';
import { ConversationController } from './controllers/conversation.controller';
import { ChatSettingController } from './controllers/chat-setting.controller';
import { AgentConfigController } from './controllers/agent-config.controller';
import { AgUiService } from './services/ag-ui.service';
import { ConversationService } from './services/conversation.service';
import { ChatSettingService } from './services/chat-setting.service';
import { AgentConfigService } from './services/agent-config.service';
import { ModelConfigModule } from '../model-config/model-config.module';
import { AgentMemoryModule } from '../agent-memory/agent-memory.module';

/**
 * AG-UI 模块
 *
 * 提供 /api/ag-ui 统一适配接口，以 SSE 输出 AG-UI 标准事件流。
 * 另提供 /admin/ag-ui/conversation 会话历史持久化接口（Markdown 文件存储，按用户隔离）。
 * 由 module-loader 自动发现，无需在 app.module 手动注册。
 * 模型连接配置落库：依赖 ModelConfigModule，运行时按 providerConfigId+modelId 解密取连接（apiKey 不再随请求携带）。
 */
@Module({
  imports: [ModelConfigModule, AgentMemoryModule],
  controllers: [
    AgUiController,
    ConversationController,
    ChatSettingController,
    AgentConfigController,
  ],
  providers: [AgUiService, ConversationService, ChatSettingService, AgentConfigService],
})
export class AgUiModule {}
