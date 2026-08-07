/**
 * 智能体能力目录（Capability Catalog）
 *
 * 这是"可被聊天智能体调用的后端能力"的唯一权威登记处，也是安全边界：
 * 技能（SysAgentSkill）只能引用这里登记过的能力 key，绝不允许指定任意 URL，
 * 从而杜绝 SSRF / 越权调用内部接口。新增能力（新接口）必须在此登记（需改代码 + 评审）。
 *
 * 每个能力最终会被解析成一个 LLM function 工具，前端通用执行器按 method+path 调用对应后端接口。
 */

/** 单个可调用能力的定义 */
export interface AgentCapability {
  /** 能力唯一 key（技能通过它引用），如 codegen.listTables */
  key: string;
  /** 暴露给 LLM 的工具名（须符合 function name 规范：字母/数字/下划线） */
  toolName: string;
  /** 能力显示名（管理 UI 展示用） */
  label: string;
  /** 暴露给 LLM 的描述，告诉模型这个工具做什么、何时用 */
  description: string;
  /** HTTP 方法 */
  method: 'GET' | 'POST';
  /** 后端接口路径（相对 API 前缀），由后端权威给出，前端不可篡改 */
  path: string;
  /** LLM function 的参数 JSON Schema */
  parameters: Record<string, unknown>;
  /** 调用该接口所需的权限点（提示用途，实际鉴权仍由目标接口的守卫强制） */
  requiredPerms?: string;
  /** 是否敏感（如写盘/改数据），管理 UI 可据此加醒目提示，默认 false */
  sensitive?: boolean;
}

/** 表名 / 模块名 / 层级 的公共参数片段（introspect / preview / generate 共用） */
const TABLE_ACTION_PARAMS: Record<string, unknown> = {
  type: 'object',
  properties: {
    tableName: { type: 'string', description: '数据库表名，如 base_sys_user' },
    module: {
      type: 'string',
      description: '模块名（kebab-case，小写字母开头，仅含小写字母/数字/连字符），可选，默认由表名推导',
    },
    tier: {
      type: 'string',
      enum: ['admin', 'app'],
      description: '鉴权体系层级，可选，默认 admin',
    },
  },
  required: ['tableName'],
};

/**
 * 能力目录（硬编码，随后端功能增长而扩充）
 * 当前登记：后端代码生成器的表查询与代码预览能力。
 * 注意：codegen.generateModule（真正落盘写文件）默认不放进任何内置技能，
 * 但仍登记在目录中，需要时可由管理员手动新建技能引用。
 */
export const AGENT_CAPABILITY_CATALOG: AgentCapability[] = [
  {
    key: 'codegen.listTables',
    toolName: 'db_list_tables',
    label: '列出数据库表',
    description: '列出当前数据库的所有表，可用关键词模糊过滤。当用户想了解数据库有哪些表时调用。',
    method: 'POST',
    path: '/admin/coding/generator/tables',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '表名模糊过滤关键词，可选' },
      },
    },
    requiredPerms: 'coding:generator:tables',
  },
  {
    key: 'codegen.introspect',
    toolName: 'db_introspect_table',
    label: '读取表结构',
    description: '读取指定数据库表的结构，推断出实体中间表示（字段、类型、注释等）。当用户想了解某张表有哪些字段时调用。',
    method: 'POST',
    path: '/admin/coding/generator/introspect',
    parameters: TABLE_ACTION_PARAMS,
    requiredPerms: 'coding:generator:introspect',
  },
  {
    key: 'codegen.preview',
    toolName: 'db_preview_module',
    label: '预览生成代码',
    description: '根据指定表预览将生成的后端模块代码（service/controller/dto/module），不写入磁盘。当用户想看某张表能生成什么代码时调用。',
    method: 'POST',
    path: '/admin/coding/generator/preview',
    parameters: TABLE_ACTION_PARAMS,
    requiredPerms: 'coding:generator:preview',
  },
  {
    key: 'codegen.generateModule',
    toolName: 'db_generate_module',
    label: '生成并写入模块代码',
    description: '根据指定表生成后端模块代码并写入磁盘，同时追加 Prisma model。会修改服务器文件，生产环境禁用。仅在用户明确要求落盘生成时调用。',
    method: 'POST',
    path: '/admin/coding/generator/generate',
    parameters: {
      type: 'object',
      properties: {
        ...(TABLE_ACTION_PARAMS.properties as Record<string, unknown>),
        force: { type: 'boolean', description: '模块已存在时是否覆盖，可选，默认 false' },
      },
      required: ['tableName'],
    },
    requiredPerms: 'coding:generator:generate',
    sensitive: true,
  },
];

/** 能力 key → 能力定义 的快速查表 */
const CATALOG_MAP = new Map<string, AgentCapability>(
  AGENT_CAPABILITY_CATALOG.map((c) => [c.key, c]),
);

/**
 * 按 key 解析能力定义
 * @param key 能力 key
 * @returns 能力定义，不存在返回 undefined
 */
export function resolveCapability(key: string): AgentCapability | undefined {
  return CATALOG_MAP.get(key);
}

/**
 * 校验一组能力 key 是否全部在目录中登记
 * @param keys 待校验的能力 key 列表
 * @returns 未登记的非法 key 列表（为空表示全部合法）
 */
export function findUnknownCapabilities(keys: string[]): string[] {
  return keys.filter((k) => !CATALOG_MAP.has(k));
}
