import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import { CliModule } from './cli.module';

/**
 * CLI 运行时上下文与输出辅助
 *
 * 通过 NestFactory.createApplicationContext 启动应用容器（不监听 HTTP），
 * 复用后端已有的 Provider（GeneratorService/IntrospectService 等），
 * 使 CLI 与 HTTP 接口共享同一套业务逻辑，零重写、零绕过。
 */

/** 是否以 JSON 结构化格式输出（供 agent 消费） */
let jsonMode = false;

/** 设置输出模式，由 commander 全局选项 --json 驱动 */
export function setJsonMode(on: boolean): void {
  jsonMode = on;
}

/** 当前是否处于 JSON 输出模式 */
export function isJsonMode(): boolean {
  return jsonMode;
}

/**
 * 创建 Nest 应用上下文（无 HTTP 监听）
 * 关闭日志以保证 stdout 仅含命令结果，便于机器解析。
 */
export async function createContext(): Promise<INestApplicationContext> {
  return NestFactory.createApplicationContext(CliModule, { logger: false });
}

/**
 * 输出成功结果
 * JSON 模式：{ ok: true, data }；文本模式：交由 humanRender 渲染。
 * @param data 结果数据
 * @param humanRender 文本模式下的渲染函数
 */
export function emit(data: unknown, humanRender: (d: any) => void): void {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ ok: true, data }, null, 2) + '\n');
  } else {
    humanRender(data);
  }
}

/**
 * 输出错误并以退出码 1 结束进程
 * JSON 模式：{ ok: false, error }；文本模式：stderr 打印。
 * @param err 捕获的错误
 */
export function fail(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ ok: false, error: message }, null, 2) + '\n');
  } else {
    process.stderr.write(`✗ ${message}\n`);
  }
  process.exit(1);
}
