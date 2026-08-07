/**
 * 数据库注释同步脚本
 *
 * 单一数据源：prisma/schema.prisma 的 /// 文档注释。
 * 因 Prisma 不会把 /// 注释写进 MySQL 的表/列 comment，本脚本读取 schema 的 ///
 * 注释，生成 ALTER TABLE 语句刷进数据库，使表/列 comment 与 schema 保持一致。
 *
 * 用法：
 *   npx ts-node scripts/sync-db-comments.ts            # 同步全部表
 *   npx ts-node scripts/sync-db-comments.ts SysPosition # 仅同步指定 model（单表验证用）
 *   DRY_RUN=1 npx ts-node scripts/sync-db-comments.ts   # 只打印 SQL 不执行
 *
 * 幂等：可重复执行，结果一致。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

/** CLI 输出（脚本无 Nest 上下文，用标准输出而非 Logger/console） */
function print(msg: string): void {
  process.stdout.write(msg + '\n');
}

/** 单个 model 从 schema 解析出的注释信息 */
interface ModelComments {
  /** model 名（PascalCase） */
  modelName: string;
  /** @@map 的物理表名 */
  tableName: string;
  /** model 级 /// 注释（表注释） */
  tableComment: string;
  /** 字段名（=列名，本项目字段无 @map）→ /// 注释 */
  fieldComments: Record<string, string>;
}

/**
 * 解析 schema.prisma，提取每个 model 的 /// 注释与 @@map 表名。
 * 规则：/// 行紧邻其后的 model 行或字段行；字段名即列名（本项目未用字段级 @map）。
 */
function parseSchema(schemaPath: string): ModelComments[] {
  const lines = readFileSync(schemaPath, 'utf-8').split('\n');
  const result: ModelComments[] = [];
  let current: ModelComments | null = null;
  let pendingDoc: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('///')) {
      pendingDoc = line.replace(/^\/\/\/\s?/, '').trim();
      continue;
    }
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      current = { modelName: modelMatch[1], tableName: '', tableComment: pendingDoc || '', fieldComments: {} };
      result.push(current);
      pendingDoc = null;
      continue;
    }
    if (!current) {
      pendingDoc = null;
      continue;
    }
    const mapMatch = line.match(/@@map\("([^"]+)"\)/);
    if (mapMatch) {
      current.tableName = mapMatch[1];
      pendingDoc = null;
      continue;
    }
    if (line === '}') {
      current = null;
      pendingDoc = null;
      continue;
    }
    // 字段行：以标识符开头且非块级关键字（@@、//）
    const fieldMatch = line.match(/^(\w+)\s+\w/);
    if (fieldMatch && pendingDoc && !line.startsWith('@@')) {
      current.fieldComments[fieldMatch[1]] = pendingDoc;
    }
    pendingDoc = null;
  }
  // 仅保留有 @@map 的 model
  return result.filter((m) => m.tableName);
}
/** information_schema 列定义原始行 */
interface ColumnDef {
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
  EXTRA: string;
  CHARACTER_SET_NAME: string | null;
  COLLATION_NAME: string | null;
}

/** 单引号转义（SQL 标准双写，兼容 NO_BACKSLASH_ESCAPES 模式） */
function quote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * 依据 information_schema 的列定义，重建 MODIFY COLUMN 的完整列定义并附加 comment。
 * MySQL 改列注释必须重述完整定义，此处忠实复刻类型/字符集/可空/默认值/EXTRA，仅追加 COMMENT。
 */
function buildModifyColumnSql(table: string, col: ColumnDef, comment: string): string {
  const parts: string[] = [`\`${col.COLUMN_NAME}\` ${col.COLUMN_TYPE}`];

  // 字符集与排序规则（字符串列需保留，避免丢失；两者需同时存在才输出 COLLATE）
  if (col.CHARACTER_SET_NAME && col.COLLATION_NAME) {
    parts.push(`CHARACTER SET ${col.CHARACTER_SET_NAME} COLLATE ${col.COLLATION_NAME}`);
  } else if (col.CHARACTER_SET_NAME) {
    parts.push(`CHARACTER SET ${col.CHARACTER_SET_NAME}`);
  }

  parts.push(col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL');

  // 默认值：CURRENT_TIMESTAMP/表达式原样输出，数字不加引号，字符串加引号
  const def = col.COLUMN_DEFAULT;
  const extra = col.EXTRA || '';
  if (def !== null) {
    const isExpr =
      /^CURRENT_TIMESTAMP/i.test(def) || extra.includes('DEFAULT_GENERATED');
    const isNumeric = /^-?\d+(\.\d+)?$/.test(def);
    parts.push(`DEFAULT ${isExpr || isNumeric ? def : quote(def)}`);
  } else if (col.IS_NULLABLE === 'YES' && !/auto_increment/i.test(extra)) {
    parts.push('DEFAULT NULL');
  }

  // EXTRA：auto_increment、on update CURRENT_TIMESTAMP 等（排除 DEFAULT_GENERATED 标记，它不是 DDL 关键字）
  const extraDdl = extra.replace(/DEFAULT_GENERATED/i, '').trim();
  if (extraDdl) parts.push(extraDdl);

  parts.push(`COMMENT ${quote(comment)}`);

  return `ALTER TABLE \`${table}\` MODIFY COLUMN ${parts.join(' ')};`;
}

/**
 * 主流程：解析 schema → 逐表生成并执行 ALTER（表注释 + 列注释）。
 * @param onlyModel 仅处理指定 model（单表验证用），不传则全量
 */
async function main(): Promise<void> {
  const onlyModel = process.argv[2];
  const dryRun = process.env.DRY_RUN === '1';
  const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
  const models = parseSchema(schemaPath).filter(
    (m) => !onlyModel || m.modelName === onlyModel,
  );

  if (!models.length) {
    print(onlyModel ? `未找到 model: ${onlyModel}` : '未解析到任何 model');
    return;
  }

  const prisma = new PrismaClient();
  let stmtCount = 0;
  try {
    for (const model of models) {
      const sqls: string[] = [];

      // 表注释
      if (model.tableComment) {
        sqls.push(`ALTER TABLE \`${model.tableName}\` COMMENT = ${quote(model.tableComment)};`);
      }

      // 列注释：读当前列定义，仅对 schema 中有注释的字段重建
      const cols = await prisma.$queryRawUnsafe<ColumnDef[]>(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, CHARACTER_SET_NAME, COLLATION_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        model.tableName,
      );
      for (const col of cols) {
        const comment = model.fieldComments[col.COLUMN_NAME];
        if (comment) sqls.push(buildModifyColumnSql(model.tableName, col, comment));
      }

      if (!sqls.length) continue;
      print(`\n-- ${model.modelName} (${model.tableName})`);
      for (const sql of sqls) {
        print(sql);
        if (!dryRun) await prisma.$executeRawUnsafe(sql);
        stmtCount++;
      }
    }
    print(`\n${dryRun ? '[DRY_RUN] 预览' : '已执行'} ${stmtCount} 条 ALTER 语句，覆盖 ${models.length} 个 model。`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  process.stderr.write(`同步失败: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});

