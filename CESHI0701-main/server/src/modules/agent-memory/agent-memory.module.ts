import { Module } from '@nestjs/common';
import { SecurityPolicyModule } from '@/modules/security-policy/security-policy.module';
import { AgentMemoryController } from './controllers/agent-memory.controller';
import { AgentMemoryService } from './services/agent-memory.service';
import { MemoryVersionService } from './services/memory-version.service';
import { MemorySuggestionService } from './services/memory-suggestion.service';
import { MemorySecurityService } from './services/memory-security.service';
import { MemoryReadLogService } from './services/memory-readlog.service';

/**
 * 记忆中心模块
 *
 * 提供智能体长期记忆文件的管理（读取/写入/版本/权限）与统计。
 * 启动时幂等写入 5 个内置记忆文件。被 discoverModules 自动发现装配，无需手动注册到 AppModule。
 * import SecurityPolicyModule 以注入 SecurityCheckService（记忆写入前安全策略统一治理）。
 * 启动/热重载时经 AgentMemoryService.onModuleInit 幂等重播种内置数据。
 */
@Module({
  imports: [SecurityPolicyModule],
  controllers: [AgentMemoryController],
  providers: [
    AgentMemoryService,
    MemoryVersionService,
    MemorySuggestionService,
    MemorySecurityService,
    MemoryReadLogService,
  ],
  exports: [AgentMemoryService],
})
export class AgentMemoryModule {}
