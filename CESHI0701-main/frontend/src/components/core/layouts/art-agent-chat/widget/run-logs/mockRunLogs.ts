/**
 * 运行日志 mock 数据
 * 提供分类计数、智能体选项与覆盖 6 类日志的示例记录（含各类型专属详情）。
 * 每个工厂函数返回全新副本，避免跨 store 实例共享引用。
 */
import type { AgentRunLog, LogCategoryCount, LogType } from './runLogTypes'

/** 各分类展示计数（与需求原型一致，独立于当前 mock 列表实际条数） */
const CATEGORY_COUNTS: Record<LogType, number> = {
  conversation: 128,
  skill: 356,
  tool: 892,
  error: 32,
  memory: 215,
  system: 48
}

/** 生成分类计数列表 */
export function createLogCategories(): LogCategoryCount[] {
  return (Object.keys(CATEGORY_COUNTS) as LogType[]).map((key) => ({ key, count: CATEGORY_COUNTS[key] }))
}

/** 智能体筛选选项（全部 + 具体智能体） */
export const AGENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'AG-UI 智能体', label: 'AG-UI 智能体' },
  { value: '部门管理助手', label: '部门管理助手' },
  { value: '后端开发智能体', label: '后端开发智能体' },
  { value: '数据分析智能体', label: '数据分析智能体' }
]

/** 生成运行日志初始数据（覆盖 6 类，含各类型专属 detail） */
export function createRunLogs(): AgentRunLog[] {
  return [
    {
      id: 'log-20250520-0001',
      sessionId: '2f5e8c7a-4b22-4c7a-9b4d-9c9a1e5f7a30',
      requestId: 'req-8a1c2d3e',
      agentName: '部门管理助手',
      type: 'conversation',
      status: 'success',
      summary: '生成部门管理后端接口',
      startedAt: '2025-05-20 15:48:32',
      endedAt: '2025-05-20 15:48:44',
      durationMs: 12340,
      user: 'admin',
      sourcePage: '组织管理 / 部门管理',
      detail: {
        userInput: '帮我生成部门管理后端接口',
        agentReply: '已为部门管理模块生成后端接口方案，并准备调用后端代码生成 Skill。',
        intent: '代码生成 / 后端接口生成',
        hitSkill: '后端代码生成 Skill',
        triggeredTool: true,
        hitMemory: true,
        model: 'Claude 3.5 Sonnet',
        tokenInput: 1200,
        tokenOutput: 860
      }
    },
    {
      id: 'log-20250520-0002',
      sessionId: '2f5e8c7a-4b22-4c7a-9b4d-9c9a1e5f7a30',
      requestId: 'req-8a1c2d3f',
      agentName: '部门管理助手',
      type: 'skill',
      status: 'success',
      summary: '调用后端代码生成 Skill 生成接口代码',
      startedAt: '2025-05-20 15:47:58',
      endedAt: '2025-05-20 15:48:16',
      durationMs: 18210,
      user: 'admin',
      sourcePage: '组织管理 / 部门管理',
      skillName: '后端代码生成',
      riskLevel: 'L3',
      detail: {
        skillName: '后端代码生成',
        version: 'v1.2.0',
        trigger: '自然语言触发',
        riskLevel: 'L3',
        manualConfirm: '已确认',
        input: `{
  "moduleName": "department",
  "tableName": "sys_department",
  "outputDir": "src/modules/department"
}`,
        output: '生成 Controller、Service、DTO、Module 文件。',
        permissionResult: '通过',
        relatedTool: 'backend-generator',
        execResult: '成功'
      }
    },
    {
      id: 'log-20250520-0003',
      sessionId: '2f5e8c7a-4b22-4c7a-9b4d-9c9a1e5f7a30',
      requestId: 'req-8a1c2d40',
      agentName: '部门管理助手',
      type: 'tool',
      status: 'success',
      summary: '执行 backend-generator 生成代码文件',
      startedAt: '2025-05-20 15:47:41',
      endedAt: '2025-05-20 15:48:07',
      durationMs: 25690,
      user: 'admin',
      sourcePage: '组织管理 / 部门管理',
      toolName: 'backend-generator',
      riskLevel: 'L3',
      detail: {
        toolName: 'backend-generator',
        toolType: 'CLI 工具',
        command: 'npm run generate:backend -- --module department',
        workDir: '/workspace/project',
        input: '{"module":"department"}',
        stdout: `生成 department.controller.ts 成功
生成 department.service.ts 成功
生成 department.module.ts 成功`,
        stderr: '无',
        exitCode: 0,
        riskResult: '通过（已人工确认）'
      }
    },
    {
      id: 'log-20250520-0004',
      sessionId: '2f5e8c7a-4b22-4c7a-9b4d-9c9a1e5f7a30',
      requestId: 'req-8a1c2d41',
      agentName: '部门管理助手',
      type: 'tool',
      status: 'success',
      summary: '查询部门树',
      startedAt: '2025-05-20 15:47:05',
      endedAt: '2025-05-20 15:47:06',
      durationMs: 1240,
      user: 'admin',
      sourcePage: '组织管理 / 部门管理',
      toolName: 'database-query',
      riskLevel: 'L1',
      detail: {
        toolName: 'database-query',
        toolType: '数据库',
        command: 'SELECT * FROM sys_department ORDER BY sort',
        workDir: '主业务库',
        input: '{"orderBy":"sort"}',
        stdout: '返回 12 条部门记录',
        stderr: '无',
        exitCode: 0,
        riskResult: '通过'
      }
    },
    {
      id: 'log-20250520-0005',
      sessionId: '2f5e8c7a-4b22-4c7a-9b4d-9c9a1e5f7a30',
      requestId: 'req-8a1c2d42',
      agentName: '部门管理助手',
      type: 'skill',
      status: 'success',
      summary: '调用权限校验 Skill 验证用户操作权限',
      startedAt: '2025-05-20 15:46:22',
      endedAt: '2025-05-20 15:46:23',
      durationMs: 860,
      user: 'admin',
      sourcePage: '组织管理 / 部门管理',
      skillName: '权限校验',
      riskLevel: 'L1',
      detail: {
        skillName: '权限校验',
        version: 'v1.0.3',
        trigger: '系统自动触发',
        riskLevel: 'L1',
        manualConfirm: '无需确认',
        input: '{"userId":"admin","action":"department:create"}',
        output: '用户具备 department:create 权限，校验通过。',
        permissionResult: '通过',
        relatedTool: 'user-api',
        execResult: '成功'
      }
    },
    {
      id: 'log-20250520-0006',
      sessionId: '2f5e8c7a-4b22-4c7a-9b4d-9c9a1e5f7a30',
      requestId: 'req-8a1c2d43',
      agentName: '部门管理助手',
      type: 'conversation',
      status: 'failed',
      summary: '新增部门“技术部”失败，名称已存在',
      startedAt: '2025-05-20 15:45:12',
      endedAt: '2025-05-20 15:45:13',
      durationMs: 930,
      user: 'admin',
      sourcePage: '组织管理 / 部门管理',
      detail: {
        userInput: '新增一个部门叫技术部',
        agentReply: '新增部门“技术部”失败，该名称已存在，请更换名称后重试。',
        intent: '部门管理 / 新增部门',
        hitSkill: '部门管理 Skill',
        triggeredTool: true,
        hitMemory: false,
        model: 'Claude 3.5 Sonnet',
        tokenInput: 320,
        tokenOutput: 96
      }
    },
    {
      id: 'log-20250520-0007',
      sessionId: '2f5e8c7a-4b22-4c7a-9b4d-9c9a1e5f7a30',
      requestId: 'req-8a1c2d44',
      agentName: '部门管理助手',
      type: 'system',
      status: 'success',
      summary: '会话开始，会话 ID：2f5e8c7a-4b22-4c7a-9b4d-9c9a1e...',
      startedAt: '2025-05-20 15:44:33',
      endedAt: '2025-05-20 15:44:33',
      durationMs: 20,
      user: 'admin',
      sourcePage: '组织管理 / 部门管理',
      detail: {
        eventName: '会话开始',
        eventType: '会话生命周期',
        eventSource: 'AG-UI 智能体面板',
        eventDesc: '用户在部门管理页面打开智能体面板并创建了新会话。',
        eventTime: '2025-05-20 15:44:33',
        relatedSession: '2f5e8c7a-4b22-4c7a-9b4d-9c9a1e5f7a30',
        relatedUser: 'admin'
      }
    },
    {
      id: 'log-20250520-0008',
      sessionId: '9d3b1f6e-7c88-4a12-b6d5-3e2f9a8c1b40',
      requestId: 'req-9b2d3e51',
      agentName: '后端开发智能体',
      type: 'memory',
      status: 'success',
      summary: '命中记忆：生成代码前必须先读取数据库表结构',
      startedAt: '2025-05-20 14:30:10',
      endedAt: '2025-05-20 14:30:10',
      durationMs: 45,
      user: 'developer',
      sourcePage: '开发工作台',
      detail: {
        hitFiles: 'memory.md、skill-memory.md',
        hitContent: `- 生成代码前必须先读取数据库表结构
- 高风险 CLI 操作需要人工确认`,
        score: 0.86,
        usePosition: 'Skill 执行前上下文注入',
        affectDecision: true,
        newCandidate: false
      }
    },
    {
      id: 'log-20250520-0009',
      sessionId: '9d3b1f6e-7c88-4a12-b6d5-3e2f9a8c1b40',
      requestId: 'req-9b2d3e52',
      agentName: '后端开发智能体',
      type: 'error',
      status: 'failed',
      summary: 'Skill 执行失败：输出目录不存在',
      startedAt: '2025-05-20 14:31:02',
      endedAt: '2025-05-20 14:31:03',
      durationMs: 1120,
      user: 'developer',
      sourcePage: '开发工作台',
      skillName: '后端代码生成',
      toolName: 'backend-generator',
      detail: {
        errorType: 'SkillExecutionError',
        errorLevel: 'Error',
        errorMessage: '输出目录不存在',
        errorStack: `SkillExecutionError: 输出目录不存在
    at BackendGenerator.run (backend-generator.ts:88)
    at SkillRunner.execute (skill-runner.ts:142)`,
        location: 'backend-generator.ts:88',
        relatedSkill: '后端代码生成',
        relatedTool: 'backend-generator',
        suggestion: '请先创建 outputDir 或检查项目根目录是否正确。',
        processed: false
      }
    },
    {
      id: 'log-20250520-0010',
      sessionId: '9d3b1f6e-7c88-4a12-b6d5-3e2f9a8c1b40',
      requestId: 'req-9b2d3e53',
      agentName: '数据分析智能体',
      type: 'tool',
      status: 'running',
      summary: '执行数据聚合查询，统计月度运单量',
      startedAt: '2025-05-20 14:35:20',
      durationMs: -1,
      user: 'analyst',
      sourcePage: '数据分析 / 运单统计',
      toolName: 'database-query',
      riskLevel: 'L1',
      detail: {
        toolName: 'database-query',
        toolType: '数据库',
        command: 'SELECT month, COUNT(*) FROM waybill GROUP BY month',
        workDir: '分析只读库',
        input: '{"groupBy":"month"}',
        stdout: '查询执行中...',
        stderr: '无',
        exitCode: null,
        riskResult: '通过'
      }
    },
    {
      id: 'log-20250520-0011',
      sessionId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      requestId: 'req-ac3e4f61',
      agentName: 'AG-UI 智能体',
      type: 'tool',
      status: 'blocked',
      summary: '尝试执行高风险删除命令被安全策略拦截',
      startedAt: '2025-05-20 13:20:44',
      endedAt: '2025-05-20 13:20:44',
      durationMs: 60,
      user: 'admin',
      sourcePage: '系统管理',
      toolName: 'file-writer',
      riskLevel: 'L4',
      detail: {
        toolName: 'file-writer',
        toolType: '文件系统',
        command: 'rm -rf /workspace/project/.git',
        workDir: '/workspace/project',
        input: '{"path":"/workspace/project/.git"}',
        stdout: '无',
        stderr: '命中拒绝目录规则，操作被阻断',
        exitCode: null,
        riskResult: '已拦截（目标命中 denyDirs）'
      }
    },
    {
      id: 'log-20250520-0012',
      sessionId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      requestId: 'req-ac3e4f62',
      agentName: 'AG-UI 智能体',
      type: 'skill',
      status: 'cancelled',
      summary: '用户取消了页面代码生成 Skill',
      startedAt: '2025-05-20 13:10:05',
      endedAt: '2025-05-20 13:10:12',
      durationMs: 7000,
      user: 'admin',
      sourcePage: '系统管理',
      skillName: '前端页面生成',
      riskLevel: 'L2',
      detail: {
        skillName: '前端页面生成',
        version: 'v2.0.1',
        trigger: '自然语言触发',
        riskLevel: 'L2',
        manualConfirm: '用户取消',
        input: '{"pageName":"report"}',
        output: '（已取消，无输出）',
        permissionResult: '通过',
        relatedTool: 'page-generator',
        execResult: '已取消'
      }
    },
    {
      id: 'log-20250520-0013',
      sessionId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      requestId: 'req-ac3e4f63',
      agentName: 'AG-UI 智能体',
      type: 'conversation',
      status: 'success',
      summary: '解答部门权限配置问题',
      startedAt: '2025-05-20 12:58:31',
      endedAt: '2025-05-20 12:58:39',
      durationMs: 8120,
      user: 'admin',
      sourcePage: '权限管理 / 角色管理',
      detail: {
        userInput: '角色权限怎么配置到部门维度？',
        agentReply: '可在角色管理中为角色绑定数据权限范围，选择“本部门及子部门”即可。',
        intent: '权限咨询 / 数据权限',
        hitSkill: '知识问答 Skill',
        triggeredTool: false,
        hitMemory: true,
        model: 'Claude 3.5 Sonnet',
        tokenInput: 540,
        tokenOutput: 310
      }
    },
    {
      id: 'log-20250520-0014',
      sessionId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      requestId: 'req-ac3e4f64',
      agentName: 'AG-UI 智能体',
      type: 'memory',
      status: 'success',
      summary: '命中记忆：高风险 CLI 操作需要人工确认',
      startedAt: '2025-05-20 12:40:18',
      endedAt: '2025-05-20 12:40:18',
      durationMs: 38,
      user: 'admin',
      sourcePage: '系统管理',
      detail: {
        hitFiles: 'skill-memory.md',
        hitContent: '- 高风险 CLI 操作需要人工确认',
        score: 0.92,
        usePosition: '工具执行前风险决策',
        affectDecision: true,
        newCandidate: true
      }
    },
    {
      id: 'log-20250520-0015',
      sessionId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      requestId: 'req-ac3e4f65',
      agentName: 'AG-UI 智能体',
      type: 'system',
      status: 'success',
      summary: '智能体模型切换为 Claude 3.5 Sonnet',
      startedAt: '2025-05-20 12:35:00',
      endedAt: '2025-05-20 12:35:00',
      durationMs: 15,
      user: 'admin',
      sourcePage: '智能体设置',
      detail: {
        eventName: '模型切换',
        eventType: '配置变更',
        eventSource: '智能体设置 / 模型配置',
        eventDesc: '用户将主用模型从 GPT-4o 切换为 Claude 3.5 Sonnet。',
        eventTime: '2025-05-20 12:35:00',
        relatedSession: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
        relatedUser: 'admin'
      }
    },
    {
      id: 'log-20250519-0016',
      sessionId: '6f7e8d9c-0b1a-42c3-94d5-6e7f8a9b0c1d',
      requestId: 'req-bd4f5a71',
      agentName: '数据分析智能体',
      type: 'error',
      status: 'failed',
      summary: 'API 调用超时：数据源无响应',
      startedAt: '2025-05-19 18:22:47',
      endedAt: '2025-05-19 18:23:02',
      durationMs: 15000,
      user: 'analyst',
      sourcePage: '数据分析 / 运单统计',
      toolName: 'user-api',
      detail: {
        errorType: 'RequestTimeoutError',
        errorLevel: 'Error',
        errorMessage: '请求超时（15s），数据源无响应',
        errorStack: `RequestTimeoutError: timeout of 15000ms exceeded
    at Timeout.onTimeout (http-client.ts:210)`,
        location: 'http-client.ts:210',
        relatedSkill: '数据查询',
        relatedTool: 'user-api',
        suggestion: '检查数据源连通性，或提高请求超时阈值。',
        processed: true
      }
    }
  ]
}

