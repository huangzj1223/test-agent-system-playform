import { Module } from '@nestjs/common';
import { SecurityPolicyModule } from '@/modules/security-policy/security-policy.module';
import { AgentSkillController } from './controllers/agent-skill.controller';
import { AgentSkillService } from './services/agent-skill.service';
import { SkillTestService } from './services/skill-test.service';
import { SkillVersionService } from './services/skill-version.service';
import { SkillPortService } from './services/skill-port.service';

/**
 * 智能体技能模块
 *
 * 提供智能体技能的管理（增删改查/开关）与能力解析（把技能引用的能力目录解析为工具定义）。
 * import SecurityPolicyModule 以注入 SecurityCheckService（技能执行前安全策略统一治理）。
 * 被 discoverModules 自动发现装配，无需手动注册到 AppModule。
 */
@Module({
  imports: [SecurityPolicyModule],
  controllers: [AgentSkillController],
  providers: [AgentSkillService, SkillTestService, SkillVersionService, SkillPortService],
  exports: [AgentSkillService],
})
export class AgentSkillModule {}
