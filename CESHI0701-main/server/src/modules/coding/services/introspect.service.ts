import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { EntityIR, RawColumn, RawTable, Tier } from '../types/ir.types';
import { IrBuilderService } from './ir-builder.service';
import { kebabCase } from '../utils/naming.util';

/** information_schema.columns 原始行 */
interface ColumnRow {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_KEY: string;
  COLUMN_COMMENT: string;
  CHARACTER_MAXIMUM_LENGTH: bigint | number | null;
}

/** information_schema.tables 原始行 */
interface TableRow {
  TABLE_NAME: string;
  TABLE_COMMENT: string;
}

/**
 * 数据库表反向读取服务
 *
 * 通过 information_schema 读取当前库的表与列结构，转交 IrBuilderService 生成 EntityIR。
 */
@Injectable()
export class IntrospectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irBuilder: IrBuilderService,
  ) {}

  /**
   * 列出当前数据库的所有表
   * @param keyword 表名模糊过滤（可选）
   */
  async listTables(keyword?: string): Promise<RawTable[]> {
    const rows = await this.prisma.$queryRaw<TableRow[]>`
      SELECT TABLE_NAME, TABLE_COMMENT
      FROM information_schema.tables
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;
    const list = rows.map((r) => ({
      tableName: r.TABLE_NAME,
      tableComment: r.TABLE_COMMENT || '',
    }));
    if (keyword) {
      const kw = keyword.toLowerCase();
      return list.filter((t) => t.tableName.toLowerCase().includes(kw));
    }
    return list;
  }

  /**
   * 读取指定表结构并构建 EntityIR
   * @param tableName 表名（外部输入，经参数化查询防注入）
   * @param module 模块名（可选，默认由表名推导为 kebab-case）
   * @param tier 鉴权体系层级（admin/app），默认 admin
   */
  async introspect(tableName: string, module?: string, tier: Tier = 'admin'): Promise<EntityIR> {
    const table = await this.getTable(tableName);
    const columns = await this.getColumns(tableName);
    const mod = module || kebabCase(tableName);
    return this.irBuilder.build(mod, table, columns, tier);
  }

  /** 读取单表元信息，不存在则抛错 */
  private async getTable(tableName: string): Promise<RawTable> {
    const rows = await this.prisma.$queryRaw<TableRow[]>`
      SELECT TABLE_NAME, TABLE_COMMENT
      FROM information_schema.tables
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${tableName}
    `;
    if (!rows.length) {
      throw new Error(`表不存在: ${tableName}`);
    }
    return { tableName: rows[0].TABLE_NAME, tableComment: rows[0].TABLE_COMMENT || '' };
  }

  /** 读取表的列结构 */
  private async getColumns(tableName: string): Promise<RawColumn[]> {
    const rows = await this.prisma.$queryRaw<ColumnRow[]>`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT, CHARACTER_MAXIMUM_LENGTH
      FROM information_schema.columns
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${tableName}
      ORDER BY ORDINAL_POSITION
    `;
    return rows.map((r) => ({
      columnName: r.COLUMN_NAME,
      dataType: r.DATA_TYPE,
      columnType: r.COLUMN_TYPE,
      nullable: r.IS_NULLABLE === 'YES',
      isPrimary: r.COLUMN_KEY === 'PRI',
      comment: r.COLUMN_COMMENT || '',
      maxLength: r.CHARACTER_MAXIMUM_LENGTH != null ? Number(r.CHARACTER_MAXIMUM_LENGTH) : null,
    }));
  }
}
