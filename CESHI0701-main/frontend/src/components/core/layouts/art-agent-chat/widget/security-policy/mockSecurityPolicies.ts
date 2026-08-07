/**
 * 安全策略 mock 数据
 * 提供风险等级、全局策略、审批规则、沙箱策略、黑白名单、敏感词、审计策略的初始数据。
 * 每个工厂函数返回全新副本，避免跨 store 实例共享引用。
 */
import type {
  RiskLevelPolicy,
  GlobalPolicy,
  ApprovalRule,
  SandboxPolicy,
  BlackWhiteList,
  SensitiveRule,
  SensitiveStats,
  AuditPolicy,
  ListItem
} from './types'

/** 生成风险等级策略（L1-L4） */
export function createRiskPolicies(): RiskLevelPolicy[] {
  return [
    {
      level: 'L1',
      name: '只读查询',
      description: '仅查询，不修改数据或配置',
      examples: ['查询报表', '查看日志', '数据筛选'],
      approvalRequirement: '无需审批',
      defaultAction: 'allow',
      enabled: true
    },
    {
      level: 'L2',
      name: '低风险写入',
      description: '有限范围内的写入操作',
      examples: ['新增记录', '更新非关键字段', '导出数据'],
      approvalRequirement: '自动通过或可配置审批',
      defaultAction: 'allow',
      enabled: true
    },
    {
      level: 'L3',
      name: '写入修改',
      description: '修改重要数据或配置',
      examples: ['更新状态', '修改配置', '批量导入'],
      approvalRequirement: '需人工审批',
      defaultAction: 'require_approval',
      enabled: true
    },
    {
      level: 'L4',
      name: '高风险执行',
      description: '可能影响系统安全或稳定性',
      examples: ['删除数据', '执行命令', '发布上线', '数据库变更'],
      approvalRequirement: '需人工审批或二次确认',
      defaultAction: 'deny',
      enabled: true
    }
  ]
}

/** 生成全局安全策略 */
export function createGlobalPolicy(): GlobalPolicy {
  return {
    highRiskDoubleConfirm: true,
    commandTimeoutSeconds: 120,
    fileDirLimitEnabled: true,
    dbWriteApproval: true,
    forceAuditLog: true
  }
}

/** 生成审批规则 */
export function createApprovalRules(): ApprovalRule[] {
  return [
    {
      id: 1,
      name: 'CLI 高风险命令审批',
      scope: 'CLI 工具',
      riskLevels: ['L3', 'L4'],
      approvalMode: 'manual',
      approverRole: '系统管理员',
      timeoutMinutes: 30,
      timeoutAction: 'deny',
      enabled: true
    },
    {
      id: 2,
      name: '数据库写入审批',
      scope: '数据库',
      riskLevels: ['L2', 'L3', 'L4'],
      approvalMode: 'manual',
      approverRole: '项目负责人',
      timeoutMinutes: 30,
      timeoutAction: 'deny',
      enabled: true
    },
    {
      id: 3,
      name: '文件覆盖审批',
      scope: '文件系统',
      riskLevels: ['L2', 'L3'],
      approvalMode: 'confirm',
      approverRole: '当前用户',
      timeoutMinutes: 10,
      timeoutAction: 'cancel',
      enabled: true
    },
    {
      id: 4,
      name: '记忆写入审批',
      scope: '记忆写入',
      riskLevels: ['L2', 'L3'],
      approvalMode: 'confirm',
      approverRole: '用户本人',
      timeoutMinutes: 10,
      timeoutAction: 'cancel',
      enabled: true
    }
  ]
}


/** 生成沙箱策略（CLI/文件/数据库/页面） */
export function createSandboxPolicy(): SandboxPolicy {
  return {
    cli: {
      enabled: true,
      allowSudo: false,
      allowNetwork: false,
      allowBackgroundProcess: false,
      timeoutSeconds: 120,
      maxOutputLength: 20000
    },
    file: {
      enabled: true,
      allowRead: true,
      allowWrite: true,
      allowDelete: false,
      allowOverwrite: true,
      maxFileSizeMB: 20,
      allowedExtensions: ['.ts', '.tsx', '.vue', '.json', '.md', '.yaml', '.sql']
    },
    database: {
      enabled: true,
      readonlyByDefault: true,
      allowInsert: false,
      allowUpdate: false,
      allowDelete: false,
      maxRows: 1000,
      timeoutSeconds: 30
    },
    page: {
      enabled: true,
      allowClick: true,
      allowInput: true,
      allowSubmit: false,
      allowDeleteAction: false,
      allowNavigation: true,
      requireSummaryBeforeRiskAction: true
    }
  }
}

/** 快捷构造黑白名单条目 */
let _itemSeq = 0
function item(value: string, description: string, riskLevel?: ListItem['riskLevel']): ListItem {
  return { id: ++_itemSeq, value, description, riskLevel, enabled: true }
}

/** 生成黑白名单（命令白/黑名单、目录白名单、API·DB 黑名单） */
export function createBlackWhiteList(): BlackWhiteList {
  return {
    commandWhitelist: [
      item('npm run generate:backend', '生成后端代码', 'L2'),
      item('npm run generate:page', '生成前端页面', 'L2'),
      item('npm run lint', '代码检查', 'L1'),
      item('npm run test', '运行测试', 'L1')
    ],
    commandBlacklist: [
      item('rm -rf /', '递归删除根目录', 'L4'),
      item('sudo rm', '提权删除', 'L4'),
      item('chmod 777', '开放全部权限', 'L4'),
      item('shutdown', '关机', 'L4'),
      item('reboot', '重启', 'L4'),
      item('DROP DATABASE', '删除数据库', 'L4'),
      item('TRUNCATE TABLE', '清空表', 'L4')
    ],
    dirWhitelist: [
      item('/workspace/project/src', '源码目录'),
      item('/workspace/project/docs', '文档目录'),
      item('/workspace/project/scripts', '脚本目录')
    ],
    apiDbBlacklist: [
      item('/api/system/delete', '系统删除接口', 'L4'),
      item('/api/user/reset-password', '重置密码接口', 'L3'),
      item('sys_user.password', '用户密码字段', 'L4'),
      item('sys_role_permission', '角色权限表', 'L3')
    ]
  }
}

/** 生成敏感词规则 */
export function createSensitiveRules(): SensitiveRule[] {
  return [
    {
      id: 1,
      type: '密码字段',
      pattern: 'password / passwd / pwd',
      action: 'mask',
      scopes: ['日志', '记忆', '工具参数'],
      enabled: true
    },
    {
      id: 2,
      type: 'Token / API Key',
      pattern: 'sk-* / token / api_key',
      action: 'deny_memory',
      scopes: ['日志', '记忆'],
      enabled: true
    },
    {
      id: 3,
      type: '身份证号',
      pattern: '身份证号码规则',
      action: 'mask',
      scopes: ['日志', '对话'],
      enabled: true
    },
    {
      id: 4,
      type: '数据库连接串',
      pattern: 'jdbc: / mysql:// / postgres://',
      action: 'audit',
      scopes: ['工具参数', '日志'],
      enabled: true
    }
  ]
}

/** 生成敏感词统计 */
export function createSensitiveStats(): SensitiveStats {
  return { total: 32, enabled: 28, blockedToday: 5, pending: 2 }
}

/** 生成审计策略 */
export function createAuditPolicy(): AuditPolicy {
  return {
    recordConversation: true,
    recordSkillCall: true,
    recordToolExecution: true,
    recordMemoryHit: true,
    recordApproval: true,
    retentionDays: 180,
    failureAlert: true,
    highRiskAlert: true,
    maskSensitiveData: true
  }
}


