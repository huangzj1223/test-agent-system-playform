import { Module } from '@nestjs/common';
import { AgentToolController } from './controllers/agent-tool.controller';
import { AgentToolService } from './services/agent-tool.service';
import { SecurityPolicyModule } from '@/modules/security-policy/security-policy.module';

/**
 * 工具权限模块
 *
 * 管理智能体可调用的工具与调用日志。checkToolPermission 委托安全策略统一校验，
 * 故 import SecurityPolicyModule 以注入 SecurityCheckService。
 * 被 discoverModules 自动发现装配，无需手动注册到 AppModule。
 */
@Module({
  imports: [SecurityPolicyModule],
  controllers: [AgentToolController],
  providers: [AgentToolService],
  exports: [AgentToolService],
})
export class AgentToolModule {}
