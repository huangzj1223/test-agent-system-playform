import { Module } from '@nestjs/common';
import { AgentRunLogController } from './controllers/agent-run-log.controller';
import { RunLogQueryService } from './services/run-log-query.service';
import { RunLogService } from './services/run-log.service';

/**
 * 运行日志模块（方案C混合）
 *
 * 由 module-loader 自动发现注册。依赖全局 PrismaService，无需额外 import。
 * 导出 RunLogService 供其他模块（AG-UI 对话链路等）注入以写 conversation/system/error 埋点。
 */
@Module({
  controllers: [AgentRunLogController],
  providers: [RunLogQueryService, RunLogService],
  exports: [RunLogService],
})
export class AgentRunLogModule {}
