import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { join, resolve, dirname, sep } from 'path';
import { EntityIR } from '../types/ir.types';
import {
  pascalCase,
  camelCase,
  kebabCase,
  snakeCase,
} from '../utils/naming.util';

/** 单个实体渲染产物（相对模块目录的文件路径 → 文件内容） */
export interface RenderedFiles {
  [relativePath: string]: string;
}

/** 写盘结果 */
export interface WriteResult {
  /** 已写入的文件绝对路径 */
  written: string[];
  /** 目标模块目录 */
  moduleDir: string;
}

/** 模板名称集合 */
const TEMPLATE_FILES = ['service.ts', 'controller.ts', 'module.ts', 'dto.ts', 'prisma-model'] as const;
type TemplateName = (typeof TEMPLATE_FILES)[number];

/**
 * 代码生成器渲染服务
 *
 * 职责：注册 Handlebars helper、加载模板、把 EntityIR 渲染为代码文件内容（preview），
 * 并可将产物写入 src/modules/ 下（generate）。
 */
@Injectable()
export class GeneratorService implements OnModuleInit {
  private templates = new Map<TemplateName, Handlebars.TemplateDelegate>();

  onModuleInit(): void {
    this.registerHelpers();
    this.loadTemplates();
  }

  /** 注册命名转换 helper */
  private registerHelpers(): void {
    Handlebars.registerHelper('kebab', (s: string) => kebabCase(s));
    Handlebars.registerHelper('camel', (s: string) => camelCase(s));
    Handlebars.registerHelper('pascal', (s: string) => pascalCase(s));
    Handlebars.registerHelper('snake', (s: string) => snakeCase(s));
  }

  /** 编译模板文件并缓存 */
  private loadTemplates(): void {
    const dir = join(__dirname, '..', 'templates');
    for (const name of TEMPLATE_FILES) {
      const raw = readFileSync(join(dir, `${name}.hbs`), 'utf-8');
      this.templates.set(name, Handlebars.compile(raw, { noEscape: true }));
    }
  }
  // PART_2

  /**
   * 渲染单个实体的 service/controller 文件
   * @param ir 实体中间表示
   * @returns 相对模块目录的文件路径 → 内容
   */
  renderEntity(ir: EntityIR): RenderedFiles {
    const ctx = this.buildEntityContext(ir);
    const kebab = kebabCase(ir.name);
    // service 不分端（业务复用）；controller 按 tier 分子目录（鉴权体系分层）
    const files: RenderedFiles = {
      [`services/${kebab}.service.ts`]: this.templates.get('service.ts')!(ctx),
      [`controllers/${ir.tier}/${kebab}.controller.ts`]: this.templates.get('controller.ts')!(ctx),
    };
    // 仅当存在进入 DTO 的字段时才生成 DTO 文件
    if (ir.fields.some((f) => f.inDto)) {
      files[`dto/${kebab}.dto.ts`] = this.templates.get('dto.ts')!(ctx);
    }
    return files;
  }

  /**
   * 渲染模块聚合文件 {module}.module.ts
   * @param module 模块名（kebab-case）
   * @param entities 模块下所有实体 IR
   */
  renderModule(module: string, entities: EntityIR[]): RenderedFiles {
    const ctx = {
      moduleClass: pascalCase(module),
      entities: entities.map((e) => ({ name: e.name, tier: e.tier })),
    };
    return {
      [`${module}.module.ts`]: this.templates.get('module.ts')!(ctx),
    };
  }

  /** 构造单实体渲染上下文，补齐模板所需派生字段 */
  private buildEntityContext(ir: EntityIR): Record<string, unknown> {
    return {
      ...ir,
      // 实体短名：实体名去掉模块前缀（DictType 在 dict 模块下 → Type）
      entityShort: this.deriveEntityShort(ir.module, ir.name),
      // 路由前缀：tier/module/short，单实体模块（实体名==模块名）省略 short
      routePrefix: this.deriveRoutePrefix(ir.tier, ir.module, ir.name),
      // class-validator 导入列表（DTO 模板用）
      validatorImports: this.collectValidatorImports(ir),
    };
  }

  /**
   * 推导路由前缀（含 tier 前缀）
   * admin + dict + DictType → admin/dict/type；admin + biz-product + BizProduct → admin/biz-product
   */
  private deriveRoutePrefix(tier: string, module: string, name: string): string {
    const short = this.deriveEntityShort(module, name);
    const moduleKebab = kebabCase(module);
    // 实体名与模块名一致时短名退化为全名，此时仅用模块名，避免 biz-product/biz-product
    const body =
      kebabCase(short) === moduleKebab
        ? moduleKebab
        : `${moduleKebab}/${kebabCase(short)}`;
    return `${tier}/${body}`;
  }

  /**
   * 收集 DTO 模板所需的 class-validator 导入
   * 来源：各字段 validators 中的装饰器名 + 模板硬编码的 IsInt/IsOptional
   * @returns 去重排序后以逗号分隔的导入名，如 'IsInt, IsOptional, IsString'
   */
  private collectValidatorImports(ir: EntityIR): string {
    const names = new Set<string>(['IsInt', 'IsOptional']);
    for (const field of ir.fields) {
      if (!field.inDto) continue;
      for (const v of field.validators) {
        // '@IsString()' / '@MaxLength(64)' → 'IsString' / 'MaxLength'
        const match = v.match(/^@(\w+)/);
        if (match) names.add(match[1]);
      }
    }
    return [...names].sort().join(', ');
  }

  /**
   * 推导实体短名（用于路由 prefix 的第二段）
   * 模块名 dict + 实体 DictType → type；若实体名不以模块名开头则用实体全名
   */
  private deriveEntityShort(module: string, name: string): string {
    const modulePascal = pascalCase(module);
    if (name.startsWith(modulePascal) && name.length > modulePascal.length) {
      return name.slice(modulePascal.length);
    }
    return name;
  }

  /**
   * 渲染整个模块的全部文件（实体文件 + 模块聚合文件）
   * @param entities 模块下所有实体 IR（须同属一个 module）
   * @returns 相对模块目录的文件路径 → 内容
   */
  previewModule(entities: EntityIR[]): RenderedFiles {
    if (!entities.length) {
      throw new BadRequestException('实体列表不能为空');
    }
    const module = entities[0].module;
    // 同一模块文件聚合多个实体，须确保它们同属一个 module，否则 module.ts 内容会错位
    const mismatch = entities.find((e) => e.module !== module);
    if (mismatch) {
      throw new BadRequestException(
        `实体 ${mismatch.name} 的 module(${mismatch.module}) 与首个实体 module(${module}) 不一致`,
      );
    }
    const files: RenderedFiles = {};
    for (const ir of entities) {
      Object.assign(files, this.renderEntity(ir));
    }
    Object.assign(files, this.renderModule(module, entities));
    return files;
  }

  /**
   * 将模块产物写入 src/modules/{module}/ 下
   * @param entities 模块下所有实体 IR
   * @param force 模块目录已存在时是否允许覆盖
   * @returns 写盘结果
   */
  writeModule(entities: EntityIR[], force = false): WriteResult {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('生产环境禁止代码生成');
    }
    if (!entities.length) {
      throw new BadRequestException('实体列表不能为空');
    }
    const module = kebabCase(entities[0].module);
    const moduleDir = this.resolveModuleDir(module);
    if (existsSync(moduleDir) && !force) {
      throw new BadRequestException(`模块已存在: ${module}，如需覆盖请传 force=true`);
    }
    const files = this.previewModule(entities);
    const written: string[] = [];
    for (const [rel, content] of Object.entries(files)) {
      const target = join(moduleDir, rel);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content, 'utf-8');
      written.push(target);
    }
    return { written, moduleDir };
  }

  /** 解析并校验模块目录，限定在 src/modules/ 下，拒绝路径穿越 */
  private resolveModuleDir(module: string): string {
    const modulesRoot = resolve(this.projectRoot(), 'src', 'modules');
    const target = resolve(modulesRoot, module);
    // 防止 ../ 穿越：目标必须严格位于 modulesRoot 之下
    // 用 path.sep 而非硬编码 '/'，否则 Windows 下反斜杠路径永远匹配失败，合法模块名会被误判为非法
    if (target !== modulesRoot && !target.startsWith(modulesRoot + sep)) {
      throw new BadRequestException(`非法模块名: ${module}`);
    }
    return target;
  }

  /**
   * 推导项目根目录（不依赖 process.cwd，避免启动目录不同导致路径偏移）
   * __dirname 在 dist 为 dist/modules/coding/services，src 为 src/modules/coding/services，
   * 向上 4 级（services→coding→modules→dist|src）即项目根。
   */
  private projectRoot(): string {
    return resolve(__dirname, '..', '..', '..', '..');
  }

  /** 渲染单个实体的 Prisma model 片段 */
  renderPrismaModel(ir: EntityIR): string {
    const businessFields = ir.fields.filter((f) => !f.isCommon && !f.isPrimary);
    return this.templates.get('prisma-model')!({
      name: ir.name,
      tableName: ir.tableName,
      businessFields,
    });
  }

  /**
   * 将实体的 Prisma model 追加到 schema.prisma（幂等：已存在同名 model 则跳过）
   * @returns true 表示新追加，false 表示已存在跳过
   */
  appendPrismaModel(ir: EntityIR): boolean {
    const schemaPath = resolve(this.projectRoot(), 'prisma', 'schema.prisma');
    const schema = readFileSync(schemaPath, 'utf-8');
    // ir.name 经 pascalCase 转换仅含字母数字，仍转义以防御正则注入
    const escapedName = ir.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 已存在同名 model 则跳过，避免重复定义
    if (new RegExp(`(^|\\n)model\\s+${escapedName}\\s*\\{`).test(schema)) {
      return false;
    }
    const model = this.renderPrismaModel(ir);
    appendFileSync(schemaPath, `\n${model}`, 'utf-8');
    return true;
  }
}

