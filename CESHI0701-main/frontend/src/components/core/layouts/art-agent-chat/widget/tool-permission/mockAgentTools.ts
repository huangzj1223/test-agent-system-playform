/**
 * 工具权限 mock 数据
 * 提供工具清单、分类计数、统计概览与调用日志的初始数据。
 * 每个工厂函数返回全新副本，避免跨 store 实例共享引用。
 */
import type { AgentTool, ToolCallLog, ToolStats, ToolCategoryCount, ToolType } from './types'

/** 各分类工具总数（与需求原型一致，统计口径独立于当前 mock 列表条数） */
const CATEGORY_COUNTS: Record<ToolType, number> = {
  cli: 12,
  api: 18,
  database: 9,
  filesystem: 7,
  page: 6,
  browser: 5,
  external: 4
}

/** 生成分类计数列表 */
export function createToolCategories(): ToolCategoryCount[] {
  return (Object.keys(CATEGORY_COUNTS) as ToolType[]).map((key) => ({ key, count: CATEGORY_COUNTS[key] }))
}

/** 生成统计概览 */
export function createToolStats(): ToolStats {
  return { total: 61, enabled: 42, highRisk: 6, callsToday: 326 }
}

/** 生成工具调用日志（按工具标识过滤时用） */
export function createToolLogs(): ToolCallLog[] {
  return [
    {
      id: 'log-1',
      toolKey: 'backend-generator',
      time: '2025-05-20 15:48:32',
      agent: 'AG-UI 智能体',
      skill: '后端代码生成 Skill',
      params: '{"moduleName":"department"}',
      success: true,
      duration: '12.34s',
      operator: 'admin'
    },
    {
      id: 'log-2',
      toolKey: 'backend-generator',
      time: '2025-05-20 15:46:21',
      agent: 'AG-UI 智能体',
      skill: '后端代码生成 Skill',
      params: '{"moduleName":"user"}',
      success: false,
      duration: '8.21s',
      operator: 'admin'
    }
  ]
}

/** 参数 Schema 示例（backend-generator 用） */
const BACKEND_PARAM_SCHEMA = `{
  "moduleName": { "type": "string", "required": true, "description": "模块名称" },
  "tableName": { "type": "string", "required": false, "description": "数据库表名" },
  "outputDir": { "type": "string", "required": false, "description": "输出目录" }
}`

/** 生成工具清单初始数据 */
export function createAgentTools(): AgentTool[] {
  return [
    {
      id: 'tool-1',
      name: 'backend-generator',
      key: 'backend-generator',
      type: 'cli',
      description: '基于模板生成后端项目结构与代码',
      riskLevel: 'L3',
      enabled: true,
      requireConfirm: true,
      applicableAgents: ['AG-UI 智能体', '开发助手智能体'],
      config: {
        command: 'npm run generate:backend -- --module {{moduleName}}',
        workDir: '/workspace/project',
        paramSchema: BACKEND_PARAM_SCHEMA,
        env: 'NODE_ENV=development',
        timeout: 60,
        maxOutput: 10000,
        allowWriteFile: true,
        allowSystemCmd: false,
        allowNetwork: true,
        confirmBeforeRun: true,
        resultParseRule: '按 stdout 末行 JSON 解析生成结果'
      },
      createdAt: '2025-05-15 10:32',
      updatedAt: '2025-05-20 15:48'
    },
    {
      id: 'tool-2',
      name: 'page-generator',
      key: 'page-generator',
      type: 'cli',
      description: '根据需求生成前端页面代码并预览',
      riskLevel: 'L2',
      enabled: true,
      requireConfirm: false,
      applicableAgents: ['AG-UI 智能体'],
      config: {
        command: 'npm run generate:page -- --name {{pageName}}',
        workDir: '/workspace/project',
        paramSchema: '{ "pageName": { "type": "string", "required": true } }',
        timeout: 45,
        maxOutput: 8000,
        allowWriteFile: true,
        allowSystemCmd: false,
        allowNetwork: false,
        confirmBeforeRun: false
      },
      createdAt: '2025-05-15 10:35',
      updatedAt: '2025-05-19 18:20'
    },
    {
      id: 'tool-3',
      name: 'database-query',
      key: 'database-query',
      type: 'database',
      description: '执行只读 SQL 查询并返回结果',
      riskLevel: 'L1',
      enabled: true,
      requireConfirm: false,
      applicableAgents: ['AG-UI 智能体'],
      config: {
        dataSource: '主业务库',
        dbType: 'MySQL',
        connection: 'primary',
        scope: 'read',
        allowTables: 'sys_user, sys_department',
        denyTables: 'sys_config',
        allowInsert: false,
        allowUpdate: false,
        allowDelete: false,
        sqlTimeout: 10,
        maxRows: 1000
      },
      createdAt: '2025-05-14 09:00',
      updatedAt: '2025-05-18 11:00'
    },
    {
      id: 'tool-4',
      name: 'file-writer',
      key: 'file-writer',
      type: 'filesystem',
      description: '在指定路径写入或更新文件内容',
      riskLevel: 'L2',
      enabled: true,
      requireConfirm: false,
      applicableAgents: ['AG-UI 智能体', '开发助手智能体'],
      config: {
        allowDirs: '/workspace/project/src',
        denyDirs: '/etc, /usr, /workspace/project/.git',
        allowRead: true,
        allowWrite: true,
        allowDelete: false,
        allowOverwrite: true,
        maxFileSize: 5,
        fileTypes: '.ts, .vue, .json, .md',
        confirmHighRisk: true
      },
      createdAt: '2025-05-14 09:10',
      updatedAt: '2025-05-18 12:00'
    },
    {
      id: 'tool-5',
      name: 'user-api',
      key: 'user-api',
      type: 'api',
      description: '获取用户信息与权限数据',
      riskLevel: 'L1',
      enabled: true,
      requireConfirm: false,
      applicableAgents: ['AG-UI 智能体'],
      config: {
        method: 'GET',
        url: '/api/user/info',
        headers: 'Content-Type: application/json',
        bodySchema: '',
        auth: 'Bearer Token',
        timeout: 15,
        allowWrite: false,
        resultMapRule: 'data -> user'
      },
      createdAt: '2025-05-13 14:00',
      updatedAt: '2025-05-17 10:00'
    },
    {
      id: 'tool-6',
      name: 'browser-control',
      key: 'browser-control',
      type: 'browser',
      description: '允许智能体控制页面点击、输入、跳转',
      riskLevel: 'L3',
      enabled: true,
      requireConfirm: true,
      applicableAgents: ['AG-UI 智能体'],
      config: {
        allowClick: true,
        allowInput: true,
        allowNavigate: true,
        allowSubmit: true,
        allowDelete: false,
        allowPages: '/organization/**, /permission/**',
        denyPages: '/system/config/**',
        showSummary: true,
        confirmHighRisk: true
      },
      createdAt: '2025-05-13 14:20',
      updatedAt: '2025-05-19 09:30'
    },
    {
      id: 'tool-7',
      name: 'department-create-api',
      key: 'department-create-api',
      type: 'api',
      description: '创建或编辑部门数据',
      riskLevel: 'L2',
      enabled: false,
      requireConfirm: true,
      applicableAgents: ['AG-UI 智能体'],
      config: {
        method: 'POST',
        url: '/api/department/save',
        headers: 'Content-Type: application/json',
        bodySchema: '{ "name": "string", "parentId": "number" }',
        auth: 'Bearer Token',
        timeout: 15,
        allowWrite: true,
        resultMapRule: 'data -> department'
      },
      createdAt: '2025-05-13 15:00',
      updatedAt: '2025-05-20 10:00'
    }
  ]
}
