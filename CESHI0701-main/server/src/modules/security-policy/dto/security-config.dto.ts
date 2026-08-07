import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 聚合配置保存入参（全局 / 沙箱 / 审计）
 *
 * 三类聚合配置结构差异大且整体读写，DTO 层只做"必须是对象"的宽松校验，
 * 具体字段的白名单归一与区间校验放到 service 层（与 chat-setting 的做法一致），
 * 避免在 DTO 里写死大量嵌套结构导致后续字段增减僵硬。
 */

/** 保存全局安全策略入参 */
export class SaveGlobalPolicyDto {
  @ApiProperty({
    description:
      '全局策略聚合体：{ highRiskDoubleConfirm, commandTimeoutSeconds, fileDirLimitEnabled, dbWriteApproval, forceAuditLog }',
  })
  @IsObject()
  settings: Record<string, unknown>;
}

/** 保存沙箱策略入参 */
export class SaveSandboxPolicyDto {
  @ApiProperty({ description: '沙箱策略聚合体：{ cli, file, database, page }（命令/目录/表名单由黑白名单表托管）' })
  @IsObject()
  settings: Record<string, unknown>;
}

/** 保存审计策略入参 */
export class SaveAuditPolicyDto {
  @ApiProperty({
    description:
      '审计策略聚合体：{ recordConversation, recordSkillCall, recordToolExecution, recordMemoryHit, recordApproval, retentionDays, failureAlert, highRiskAlert, maskSensitiveData }',
  })
  @IsObject()
  settings: Record<string, unknown>;
}
