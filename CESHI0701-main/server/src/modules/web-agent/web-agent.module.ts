import { Module } from '@nestjs/common';
import { WebAgentController } from './controllers/web-agent.controller';
import { PlaywrightService } from './services/playwright.service';

/**
 * 网页读取模块
 *
 * 提供无头浏览器读取网页正文的能力，供智能体前端 web.readPage 工具调用。
 * 被 discoverModules 自动发现装配，无需手动注册到 AppModule。
 */
@Module({
  controllers: [WebAgentController],
  providers: [PlaywrightService],
  exports: [PlaywrightService],
})
export class WebAgentModule {}
