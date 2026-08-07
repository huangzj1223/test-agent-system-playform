import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';

const logger = new Logger('ModuleLoader');

/** NestJS @Module 装饰器写入的 metadata key，用于识别模块类 */
const MODULE_METADATA_KEYS = ['imports', 'controllers', 'providers', 'exports'];

/** 判断一个导出值是否为 NestJS 模块类（被 @Module 装饰） */
function isNestModule(value: unknown): boolean {
  if (typeof value !== 'function') return false;
  return MODULE_METADATA_KEYS.some((key) => Reflect.hasMetadata(key, value));
}

/**
 * 自动发现 src/modules（运行时为 dist/modules）下的所有业务模块
 *
 * 扫描每个 modules/{name}/ 子目录下的 *.module.{js,ts}，require 后收集被 @Module 装饰的类。
 * 这样新增模块（含 AI 生成的模块）无需手动改 app.module，放进 modules/ 重启即可生效。
 */
export function discoverModules(): unknown[] {
  // __dirname 运行时为 dist/common，src 下为 src/common，同级 ../modules 即模块根
  const modulesRoot = join(__dirname, '..', 'modules');
  if (!existsSync(modulesRoot)) return [];

  const modules: unknown[] = [];
  const seen = new Set<unknown>();

  for (const entry of readdirSync(modulesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const moduleDir = join(modulesRoot, entry.name);
    const moduleFile = findModuleFile(moduleDir, entry.name);
    if (!moduleFile) continue;

    try {
      const exported = require(moduleFile);
      for (const value of Object.values(exported)) {
        if (isNestModule(value) && !seen.has(value)) {
          seen.add(value);
          modules.push(value);
        }
      }
    } catch (err) {
      // 单个模块加载失败不应拖垮整个应用，记录后跳过
      logger.error(`加载模块失败，已跳过: ${moduleFile} - ${(err as Error).message}`);
    }
  }
  return modules;
}

/** 在模块目录下查找 {name}.module.{js,ts} 文件 */
function findModuleFile(moduleDir: string, name: string): string | null {
  for (const ext of ['.module.js', '.module.ts']) {
    const file = join(moduleDir, `${name}${ext}`);
    if (existsSync(file)) return file;
  }
  return null;
}
