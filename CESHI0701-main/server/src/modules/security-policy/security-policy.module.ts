import { Module } from '@nestjs/common';
import { SecurityPolicyController } from './controllers/security-policy.controller';
import { SecurityPolicyService } from './services/security-policy.service';
import { SecurityCheckService } from './services/security-check.service';
import { ApprovalRequestService } from './services/approval-request.service';

/**
 * 安全策略模块
 *
 * 统一管理智能体安全边界：风险等级 / 审批规则 / 沙箱策略 / 黑白名单 / 敏感词 / 审计策略，
 * 提供统一安全校验入口 SecurityCheckService 与审批工单流转 ApprovalRequestService。
 * 被 discoverModules 自动发现装配，无需手动注册到 AppModule。
 * exports 供工具权限模块（checkToolPermission 委托）与后续 Skills 校验复用。
 */
@Module({
  controllers: [SecurityPolicyController],
  providers: [SecurityPolicyService, SecurityCheckService, ApprovalRequestService],
  exports: [SecurityPolicyService, SecurityCheckService, ApprovalRequestService],
})
export class SecurityPolicyModule {}
