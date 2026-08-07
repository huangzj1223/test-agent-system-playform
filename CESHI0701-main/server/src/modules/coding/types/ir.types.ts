/**
 * 代码生成器 - 实体中间表示（IR）
 *
 * IR 是生成器的唯一输入契约：无论来源是数据库表、Prisma schema 还是 AI 需求，
 * 都先归一化为 EntityIR，模板层只认 IR。
 */

/** CRUD 接口类型 */
export type CrudApi = 'add' | 'delete' | 'update' | 'info' | 'list' | 'page';

/** 字段中间表示 */
export interface FieldIR {
  /** 字段名（camelCase），如 deviceNo */
  name: string;
  /** 列名（snake_case），如 device_no */
  columnName: string;
  /** TS 类型 */
  tsType: 'string' | 'number' | 'boolean' | 'Date';
  /** Prisma 类型 */
  prismaType: 'String' | 'Int' | 'BigInt' | 'Float' | 'Decimal' | 'Boolean' | 'DateTime';
  /** 是否可空 */
  nullable: boolean;
  /** 字段中文说明 */
  comment: string;
  /** 是否主键（主键不进 DTO/查询） */
  isPrimary: boolean;
  /** 是否公共字段（id/createTime/updateTime/tenantId，不重复生成） */
  isCommon: boolean;
  /** class-validator 装饰器列表，如 ['@IsString()', '@MaxLength(64)'] */
  validators: string[];
  /** 是否进入 Create/Update DTO */
  inDto: boolean;
  /** 是否作为查询条件 */
  inQuery: boolean;
  /** Prisma model 字段的额外属性，如 @db.VarChar(64) */
  dbAttr?: string;
}

/** CRUD 查询配置 */
export interface CrudQueryOptions {
  /** 生成哪些接口 */
  api: CrudApi[];
  /** 模糊搜索字段 */
  keyWordLikeFields: string[];
  /** 精确筛选字段 */
  fieldEq: string[];
}

/** 鉴权体系层级：admin=后台管理端，app=C端/开放端 */
export type Tier = 'admin' | 'app';

/** 实体中间表示 - 代码生成器的唯一输入契约 */
export interface EntityIR {
  /** 鉴权体系层级，决定路由前缀与 controller 子目录，默认 admin */
  tier: Tier;
  /** 模块名（kebab-case），如 equipment */
  module: string;
  /** 实体名（PascalCase），如 EquipmentArchive */
  name: string;
  /** Prisma model 访问名（camelCase），如 equipmentArchive */
  modelName: string;
  /** 数据库表名（snake_case），如 equipment_archive */
  tableName: string;
  /** 业务名/中文注释，如 设备档案 */
  comment: string;
  /** 字段列表 */
  fields: FieldIR[];
  /** CRUD 配置 */
  options: CrudQueryOptions;
}

/** 数据库表元信息（来自 information_schema.tables） */
export interface RawTable {
  /** 表名 */
  tableName: string;
  /** 表注释 */
  tableComment: string;
}

/** 数据库列元信息（来自 information_schema.columns） */
export interface RawColumn {
  /** 列名（snake_case） */
  columnName: string;
  /** 数据类型，如 varchar、int、datetime、tinyint */
  dataType: string;
  /** 完整列类型，如 varchar(64)、tinyint(1)、int unsigned（用于 tinyint(1) 布尔判断） */
  columnType: string;
  /** 是否可空 */
  nullable: boolean;
  /** 是否主键 */
  isPrimary: boolean;
  /** 列注释 */
  comment: string;
  /** 字符串最大长度（varchar 等），无则为 null */
  maxLength: number | null;
}

