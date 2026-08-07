/**
 * 工具配置字段描述
 * 按工具类型定义各自的专属配置字段，供 ToolConfigFields 以描述驱动方式渲染，
 * 避免为 7 种类型写 7 段重复模板。
 */
import type { ToolType } from './types'
import { HTTP_METHODS, DB_SCOPES } from './types'

/** 单个配置字段控件类型 */
export type FieldControl = 'input' | 'textarea' | 'number' | 'switch' | 'select'

/** 配置字段描述 */
export interface FieldDef {
  /** 字段 key（对应 config 对象属性） */
  key: string
  /** 标签 */
  label: string
  /** 控件类型 */
  control: FieldControl
  /** 占位提示 */
  placeholder?: string
  /** select 选项 */
  options?: { value: string; label: string }[]
  /** 数字单位后缀 */
  suffix?: string
}

/** 把字符串数组转为 select 选项 */
const toOptions = (arr: string[]) => arr.map((v) => ({ value: v, label: v }))

/** CLI 工具配置字段 */
const CLI_FIELDS: FieldDef[] = [
  { key: 'command', label: '执行命令', control: 'textarea', placeholder: 'npm run generate:backend -- --module {{moduleName}}' },
  { key: 'workDir', label: '工作目录', control: 'input', placeholder: '/workspace/project' },
  { key: 'paramSchema', label: '参数 Schema', control: 'textarea', placeholder: 'JSON 参数结构定义' },
  { key: 'env', label: '环境变量', control: 'input', placeholder: 'KEY=VALUE，多个用逗号分隔' },
  { key: 'timeout', label: '超时时间', control: 'number', suffix: '秒' },
  { key: 'maxOutput', label: '最大输出长度', control: 'number', suffix: '字符' },
  { key: 'allowWriteFile', label: '允许写文件', control: 'switch' },
  { key: 'allowSystemCmd', label: '允许执行系统命令', control: 'switch' },
  { key: 'allowNetwork', label: '允许访问网络', control: 'switch' },
  { key: 'confirmBeforeRun', label: '执行前确认', control: 'switch' },
  { key: 'resultParseRule', label: '结果解析规则', control: 'textarea', placeholder: '执行后结果解析规则' }
]

/** API 工具配置字段 */
const API_FIELDS: FieldDef[] = [
  { key: 'method', label: '请求方法', control: 'select', options: toOptions(HTTP_METHODS) },
  { key: 'url', label: 'API 地址', control: 'input', placeholder: '/api/xxx' },
  { key: 'headers', label: 'Header 配置', control: 'textarea', placeholder: 'Content-Type: application/json' },
  { key: 'bodySchema', label: 'Body Schema', control: 'textarea', placeholder: 'JSON 请求体结构' },
  { key: 'auth', label: '鉴权方式', control: 'input', placeholder: 'Bearer Token / API Key' },
  { key: 'timeout', label: '超时时间', control: 'number', suffix: '秒' },
  { key: 'allowWrite', label: '允许写操作', control: 'switch' },
  { key: 'resultMapRule', label: '返回结果映射规则', control: 'textarea', placeholder: 'data -> xxx' }
]

/** 数据库工具配置字段 */
const DB_FIELDS: FieldDef[] = [
  { key: 'dataSource', label: '数据源名称', control: 'input' },
  { key: 'dbType', label: '数据库类型', control: 'input', placeholder: 'MySQL / PostgreSQL' },
  { key: 'connection', label: '连接名称', control: 'input' },
  { key: 'scope', label: '权限范围', control: 'select', options: DB_SCOPES },
  { key: 'allowTables', label: '允许访问的表', control: 'textarea', placeholder: '多个表用逗号分隔' },
  { key: 'denyTables', label: '禁止访问的表', control: 'textarea', placeholder: '多个表用逗号分隔' },
  { key: 'allowInsert', label: '允许 INSERT', control: 'switch' },
  { key: 'allowUpdate', label: '允许 UPDATE', control: 'switch' },
  { key: 'allowDelete', label: '允许 DELETE', control: 'switch' },
  { key: 'sqlTimeout', label: 'SQL 超时时间', control: 'number', suffix: '秒' },
  { key: 'maxRows', label: '最大返回行数', control: 'number', suffix: '行' }
]

/** 文件系统工具配置字段 */
const FS_FIELDS: FieldDef[] = [
  { key: 'allowDirs', label: '可访问目录白名单', control: 'textarea', placeholder: '多个目录用逗号分隔' },
  { key: 'denyDirs', label: '禁止访问目录黑名单', control: 'textarea', placeholder: '多个目录用逗号分隔' },
  { key: 'allowRead', label: '允许读取', control: 'switch' },
  { key: 'allowWrite', label: '允许写入', control: 'switch' },
  { key: 'allowDelete', label: '允许删除', control: 'switch' },
  { key: 'allowOverwrite', label: '允许覆盖', control: 'switch' },
  { key: 'maxFileSize', label: '最大文件大小', control: 'number', suffix: 'MB' },
  { key: 'fileTypes', label: '文件类型白名单', control: 'input', placeholder: '.ts, .vue, .json' },
  { key: 'confirmHighRisk', label: '高风险操作需确认', control: 'switch' }
]

/** 页面操作 / 浏览器控制配置字段（两类共用） */
const PAGE_FIELDS: FieldDef[] = [
  { key: 'allowClick', label: '允许点击', control: 'switch' },
  { key: 'allowInput', label: '允许输入', control: 'switch' },
  { key: 'allowNavigate', label: '允许跳转', control: 'switch' },
  { key: 'allowSubmit', label: '允许提交表单', control: 'switch' },
  { key: 'allowDelete', label: '允许删除操作', control: 'switch' },
  { key: 'allowPages', label: '页面范围白名单', control: 'textarea', placeholder: '/organization/**, /permission/**' },
  { key: 'denyPages', label: '页面范围黑名单', control: 'textarea', placeholder: '/system/config/**' },
  { key: 'showSummary', label: '操作前展示摘要', control: 'switch' },
  { key: 'confirmHighRisk', label: '高风险操作需确认', control: 'switch' }
]

/** 外部服务配置字段 */
const EXTERNAL_FIELDS: FieldDef[] = [
  { key: 'serviceName', label: '服务名称', control: 'input' },
  { key: 'serviceUrl', label: '服务地址', control: 'input', placeholder: 'https://api.example.com' },
  { key: 'auth', label: '鉴权方式', control: 'input', placeholder: 'API Key / OAuth' },
  { key: 'rateLimit', label: '调用频率限制', control: 'number', suffix: '次/分钟' },
  { key: 'timeout', label: '超时时间', control: 'number', suffix: '秒' },
  { key: 'allowSensitive', label: '允许发送敏感信息', control: 'switch' },
  { key: 'logCalls', label: '记录调用日志', control: 'switch' }
]

/** 工具类型 → 专属配置字段描述 */
export const CONFIG_FIELDS: Record<ToolType, FieldDef[]> = {
  cli: CLI_FIELDS,
  api: API_FIELDS,
  database: DB_FIELDS,
  filesystem: FS_FIELDS,
  page: PAGE_FIELDS,
  browser: PAGE_FIELDS,
  external: EXTERNAL_FIELDS
}

/** 各配置字段的默认值（新建工具切换类型时初始化 config） */
export function defaultConfig(type: ToolType): Record<string, unknown> {
  const cfg: Record<string, unknown> = {}
  CONFIG_FIELDS[type].forEach((f) => {
    if (f.control === 'switch') cfg[f.key] = false
    else if (f.control === 'number') cfg[f.key] = 0
    else if (f.control === 'select') cfg[f.key] = f.options?.[0]?.value ?? ''
    else cfg[f.key] = ''
  })
  return cfg
}

