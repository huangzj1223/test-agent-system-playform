import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 缓存服务
 *
 * 封装 ioredis 客户端，提供统一的连接管理与基础读写能力（get/set/del）。
 * 连接参数从配置读取，应用销毁时主动关闭连接。
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB', 0),
    });
  }

  /** 获取底层 ioredis 客户端，供需要原生命令的场景直接使用 */
  getClient(): Redis {
    return this.client;
  }

  /**
   * 读取键值
   * @param key 键
   * @returns 对应字符串值，不存在时为 null
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * 写入键值
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒），不传则永不过期
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  /** 删除指定键 */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** 应用销毁时优雅关闭 Redis 连接 */
  async onModuleDestroy() {
    await this.client.quit();
  }
}
