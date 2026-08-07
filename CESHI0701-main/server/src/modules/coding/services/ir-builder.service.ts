import { Injectable } from '@nestjs/common';
import {
  EntityIR,
  FieldIR,
  RawColumn,
  RawTable,
  Tier,
} from '../types/ir.types';
import { camelCase, pascalCase, kebabCase } from '../utils/naming.util';

/** 公共字段名 - 不进 DTO、不重复生成（由 BaseEntity/模板固定提供） */
const COMMON_FIELDS = new Set(['id', 'createTime', 'updateTime', 'tenantId']);

/** DB 数据类型 → { ts, prisma } 类型映射 */
const TYPE_MAP: Record<string, { ts: FieldIR['tsType']; prisma: FieldIR['prismaType'] }> = {
  varchar: { ts: 'string', prisma: 'String' },
  char: { ts: 'string', prisma: 'String' },
  text: { ts: 'string', prisma: 'String' },
  longtext: { ts: 'string', prisma: 'String' },
  mediumtext: { ts: 'string', prisma: 'String' },
  tinytext: { ts: 'string', prisma: 'String' },
  json: { ts: 'string', prisma: 'String' },
  int: { ts: 'number', prisma: 'Int' },
  integer: { ts: 'number', prisma: 'Int' },
  smallint: { ts: 'number', prisma: 'Int' },
  mediumint: { ts: 'number', prisma: 'Int' },
  bigint: { ts: 'number', prisma: 'BigInt' },
  decimal: { ts: 'number', prisma: 'Decimal' },
  float: { ts: 'number', prisma: 'Float' },
  double: { ts: 'number', prisma: 'Float' },
  datetime: { ts: 'Date', prisma: 'DateTime' },
  timestamp: { ts: 'Date', prisma: 'DateTime' },
  date: { ts: 'Date', prisma: 'DateTime' },
  // tinyint(1) 视为布尔，其余 tinyint 在 mapType 中按 number 处理
};

// PART_2

/**
 * IR 构建服务
 *
 * 把数据库表的原始列结构（RawColumn）推断为 EntityIR，供模板层渲染。
 * 推断规则见设计文档 2.3 节：类型映射、公共字段识别、主键约束、查询条件与校验器推断。
 */
@Injectable()
export class IrBuilderService {
  /**
   * 由表元信息 + 列结构构建 EntityIR
   * @param module 模块名（kebab-case），通常由调用方指定或从表名推导
   * @param table 表元信息
   * @param columns 列结构
   * @param tier 鉴权体系层级（admin/app），默认 admin
   */
  build(module: string, table: RawTable, columns: RawColumn[], tier: Tier = 'admin'): EntityIR {
    const name = pascalCase(table.tableName);
    const fields = columns.map((c) => this.buildField(c));
    return {
      tier,
      module,
      name,
      modelName: camelCase(name),
      tableName: table.tableName,
      comment: this.sanitizeComment(table.tableComment) || name,
      fields,
      options: this.buildOptions(fields),
    };
  }

  /** 单列 → FieldIR */
  private buildField(col: RawColumn): FieldIR {
    const name = camelCase(col.columnName);
    const isCommon = COMMON_FIELDS.has(name);
    const { ts, prisma } = this.mapType(col);
    // 主键与公共字段不进 DTO/查询
    const usable = !col.isPrimary && !isCommon;
    return {
      name,
      columnName: col.columnName,
      tsType: ts,
      prismaType: prisma,
      nullable: col.nullable,
      comment: this.sanitizeComment(col.comment) || name,
      isPrimary: col.isPrimary,
      isCommon,
      validators: usable ? this.inferValidators(ts, col) : [],
      inDto: usable,
      inQuery: usable && this.inferInQuery(name),
      dbAttr: this.inferDbAttr(prisma, col),
    };
  }

  /** 净化注释：移除 Handlebars 语法与换行/单引号，避免破坏模板渲染与生成代码 */
  private sanitizeComment(comment: string): string {
    return (comment || '')
      .replace(/\{\{|\}\}/g, '')
      .replace(/['\r\n]/g, ' ')
      .trim();
  }

  /** DB 类型 → TS/Prisma 类型（处理 tinyint(1) 布尔特例） */
  private mapType(
    col: RawColumn,
  ): { ts: FieldIR['tsType']; prisma: FieldIR['prismaType'] } {
    const dt = col.dataType.toLowerCase();
    if (dt === 'tinyint') {
      // tinyint(1) 习惯用作布尔；其余按整数
      return /tinyint\(1\)/i.test(col.columnType)
        ? { ts: 'boolean', prisma: 'Boolean' }
        : { ts: 'number', prisma: 'Int' };
    }
    return TYPE_MAP[dt] || { ts: 'string', prisma: 'String' };
  }

  /** 推断 class-validator 装饰器（不含 @IsOptional，可空性由 DTO 模板按场景控制） */
  private inferValidators(ts: FieldIR['tsType'], col: RawColumn): string[] {
    const out: string[] = [];
    switch (ts) {
      case 'string':
        out.push('@IsString()');
        // 仅定长字符串（varchar/char）加长度限制，TEXT 族不加
        if (this.isBoundedString(col.dataType) && col.maxLength && col.maxLength > 0) {
          out.push(`@MaxLength(${col.maxLength})`);
        }
        break;
      case 'number':
        out.push('@IsInt()');
        break;
      case 'boolean':
        out.push('@IsBoolean()');
        break;
      case 'Date':
        out.push('@IsDateString()');
        break;
    }
    return out;
  }

  /** 是否定长字符串类型（可加 MaxLength） */
  private isBoundedString(dataType: string): boolean {
    return ['varchar', 'char'].includes(dataType.toLowerCase());
  }

  /** 推断字段是否作为查询条件 */
  private inferInQuery(name: string): boolean {
    return this.isEqField(name) || this.isLikeField(name);
  }

  /** 精确匹配字段：status / type / xxxId 结尾 */
  private isEqField(name: string): boolean {
    return /status$/i.test(name) || /type$/i.test(name) || /Id$/.test(name);
  }

  /** 模糊匹配字段：name / title / code / xxxNo 结尾 */
  private isLikeField(name: string): boolean {
    return /name$/i.test(name) || /title$/i.test(name) || /code$/i.test(name) || /No$/.test(name);
  }

  /** 组装 CRUD 查询配置 */
  private buildOptions(fields: FieldIR[]): EntityIR['options'] {
    const keyWordLikeFields: string[] = [];
    const fieldEq: string[] = [];
    for (const f of fields) {
      if (!f.inQuery) continue;
      if (this.isLikeField(f.name)) keyWordLikeFields.push(f.name);
      else if (this.isEqField(f.name)) fieldEq.push(f.name);
    }
    return {
      api: ['add', 'delete', 'update', 'info', 'page', 'list'],
      keyWordLikeFields,
      fieldEq,
    };
  }

  /** 推断 Prisma model 字段的 @db 属性 */
  private inferDbAttr(prisma: FieldIR['prismaType'], col: RawColumn): string | undefined {
    if (
      prisma === 'String' &&
      this.isBoundedString(col.dataType) &&
      col.maxLength &&
      col.maxLength > 0 &&
      col.maxLength <= 255
    ) {
      return `@db.VarChar(${col.maxLength})`;
    }
    return undefined;
  }
}

