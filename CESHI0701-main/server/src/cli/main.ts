#!/usr/bin/env node
import { Command } from 'commander';
import { IntrospectService } from '@/modules/coding/services/introspect.service';
import { GeneratorService } from '@/modules/coding/services/generator.service';
import { Tier } from '@/modules/coding/types/ir.types';
import { createContext, setJsonMode, emit, fail } from './context';

/**
 * agentpm 后端能力 CLI 入口
 *
 * 把后端代码生成能力（列表/内省/预览/生成）暴露为子命令，供 AI agent 通过命令行调用，
 * 满足 CLI 契约：子命令 + --help 自描述 + --json 结构化输出。
 * 业务逻辑全部复用 CodingModule 的 Provider，不重写。
 */

/** tier 参数校验，非法值直接失败 */
function parseTier(value?: string): Tier {
  if (value && value !== 'admin' && value !== 'app') {
    fail(`tier 只能是 admin 或 app，收到: ${value}`);
  }
  return (value as Tier) || 'admin';
}

/** 模块名格式校验（kebab-case），与 HTTP 层 TableActionDto 保持一致的输入契约 */
const MODULE_NAME_RULE = /^[a-z][a-z0-9-]*$/;
function parseModule(value?: string): string | undefined {
  if (value !== undefined && !MODULE_NAME_RULE.test(value)) {
    fail(`模块名须为 kebab-case（小写字母开头，仅含小写字母/数字/连字符），收到: ${value}`);
  }
  return value;
}

/**
 * 在 Nest 上下文内执行任务，确保上下文最终关闭
 * @param task 接收容器、返回结果的异步任务
 */
async function withContext<T>(
  task: (get: <S>(type: new (...args: any[]) => S) => S) => Promise<T>,
): Promise<T> {
  const ctx = await createContext();
  try {
    return await task((type) => ctx.get(type));
  } finally {
    await ctx.close();
  }
}

const program = new Command();

program
  .name('agentpm-cli')
  .description('agentpm 后端能力 CLI —— 供 AI agent 调用的代码生成器接口')
  .version('1.0.0')
  .option('--json', '以 JSON 结构化格式输出，供程序消费', false)
  .hook('preAction', (thisCommand) => {
    setJsonMode(Boolean(thisCommand.opts().json));
  });

// db:tables —— 列出当前数据库的表
program
  .command('db:tables')
  .description('列出当前数据库的表，可按关键词过滤')
  .option('-k, --keyword <keyword>', '表名模糊过滤')
  .action(async (opts) => {
    try {
      const tables = await withContext((get) =>
        get(IntrospectService).listTables(opts.keyword),
      );
      emit(tables, (list: { tableName: string; tableComment: string }[]) => {
        if (!list.length) {
          process.stdout.write('（无匹配的表）\n');
          return;
        }
        for (const t of list) {
          process.stdout.write(`${t.tableName}\t${t.tableComment}\n`);
        }
        process.stdout.write(`\n共 ${list.length} 张表\n`);
      });
    } catch (e) {
      fail(e);
    }
  });

// gen:introspect —— 读取表结构并推断 IR
program
  .command('gen:introspect')
  .description('读取指定表结构，推断出实体中间表示（IR）')
  .argument('<table>', '数据库表名')
  .option('-m, --module <module>', '模块名（kebab-case），默认由表名推导')
  .option('-t, --tier <tier>', '鉴权体系层级 admin/app', 'admin')
  .action(async (table, opts) => {
    try {
      const tier = parseTier(opts.tier);
      const module = parseModule(opts.module);
      const ir = await withContext((get) =>
        get(IntrospectService).introspect(table, module, tier),
      );
      emit(ir, (data) => {
        process.stdout.write(`实体: ${data.name}（${data.comment}）\n`);
        process.stdout.write(`表名: ${data.tableName}  模块: ${data.module}  层级: ${data.tier}\n`);
        process.stdout.write(`字段数: ${data.fields.length}\n`);
      });
    } catch (e) {
      fail(e);
    }
  });

// gen:preview —— 预览生成的代码（不写盘）
program
  .command('gen:preview')
  .description('预览将生成的模块代码，不写入磁盘')
  .argument('<table>', '数据库表名')
  .option('-m, --module <module>', '模块名（kebab-case），默认由表名推导')
  .option('-t, --tier <tier>', '鉴权体系层级 admin/app', 'admin')
  .action(async (table, opts) => {
    try {
      const tier = parseTier(opts.tier);
      const module = parseModule(opts.module);
      const files = await withContext(async (get) => {
        const ir = await get(IntrospectService).introspect(table, module, tier);
        return get(GeneratorService).previewModule([ir]);
      });
      emit(files, (data: Record<string, string>) => {
        for (const [path, content] of Object.entries(data)) {
          process.stdout.write(`\n===== ${path} =====\n${content}\n`);
        }
      });
    } catch (e) {
      fail(e);
    }
  });

// gen:module —— 生成并写入模块代码
program
  .command('gen:module')
  .description('生成并写入模块代码（含 Prisma model 片段）；生产环境禁用')
  .argument('<table>', '数据库表名')
  .option('-m, --module <module>', '模块名（kebab-case），默认由表名推导')
  .option('-t, --tier <tier>', '鉴权体系层级 admin/app', 'admin')
  .option('-f, --force', '模块已存在时覆盖', false)
  .action(async (table, opts) => {
    try {
      const tier = parseTier(opts.tier);
      const module = parseModule(opts.module);
      const result = await withContext(async (get) => {
        const ir = await get(IntrospectService).introspect(table, module, tier);
        const generator = get(GeneratorService);
        const write = generator.writeModule([ir], Boolean(opts.force));
        const modelAppended = generator.appendPrismaModel(ir);
        return {
          ...write,
          modelAppended,
          hint: modelAppended
            ? '已追加 Prisma model，请运行 npm run prisma:push 同步数据库与客户端后重启服务'
            : 'Prisma model 已存在，未重复追加',
        };
      });
      emit(result, (data) => {
        process.stdout.write(`✓ 已写入 ${data.written.length} 个文件到 ${data.moduleDir}\n`);
        for (const f of data.written) {
          process.stdout.write(`  - ${f}\n`);
        }
        process.stdout.write(`${data.hint}\n`);
      });
    } catch (e) {
      fail(e);
    }
  });

// 顶层兜底：commander 钩子或未被 action 内 try/catch 覆盖的路径抛错时，统一走 fail 保证退出码为 1
program.parseAsync(process.argv).catch((e) => fail(e));
