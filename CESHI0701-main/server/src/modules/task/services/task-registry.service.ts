import { Injectable, Logger } from '@nestjs/common';

/**
 * 任务处理器类型：接收任务携带的 data，返回执行结果描述
 */
export type TaskHandler = (data?: any) => Promise<string | void>;

/**
 * 任务处理器注册表
 *
 * 安全设计：任务执行不通过 eval / 动态 require 执行任意字符串，
 * 而是通过预先注册的处理器白名单按 key 调用，杜绝代码注入。
 * 业务方在自己的模块中调用 register() 注册处理器。
 */
@Injectable()
export class TaskRegistry {
  private readonly logger = new Logger(TaskRegistry.name);
  private readonly handlers = new Map<string, TaskHandler>();

  /**
   * 注册任务处理器
   * @param key 处理器唯一标识（对应 TaskInfo.service 字段）
   * @param handler 处理器函数
   */
  register(key: string, handler: TaskHandler) {
    if (this.handlers.has(key)) {
      this.logger.warn(`任务处理器 ${key} 已存在，将被覆盖`);
    }
    this.handlers.set(key, handler);
  }

  /**
   * 获取已注册的处理器
   * @param key 处理器标识
   */
  get(key: string): TaskHandler | undefined {
    return this.handlers.get(key);
  }

  /**
   * 列出所有已注册的处理器 key
   */
  list(): string[] {
    return [...this.handlers.keys()];
  }

  /**
   * 判断处理器是否存在
   */
  has(key: string): boolean {
    return this.handlers.has(key);
  }
}
