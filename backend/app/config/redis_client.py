"""
Redis 客户端封装

提供异步 Redis 连接，用于缓存登录 token 与用户权限。
支持两种后端：
- 真实 Redis（生产/默认）；
- 进程内内存后端（仅当 settings.redis_use_memory=True，用于本地无 Redis 的开发联调）。
"""

import time
from typing import Optional

import redis.asyncio as aioredis

from app.config.settings import settings


class _InMemoryRedis:
    """极简进程内 KV，支持过期。仅用于本地开发联调，非线程/进程共享。"""

    def __init__(self) -> None:
        self._store: dict[str, tuple[str, Optional[float]]] = {}

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> None:
        expire_at = time.time() + ex if ex else None
        self._store[key] = (value, expire_at)

    async def get(self, key: str) -> Optional[str]:
        item = self._store.get(key)
        if not item:
            return None
        value, expire_at = item
        if expire_at is not None and time.time() > expire_at:
            self._store.pop(key, None)
            return None
        return value

    async def delete(self, *keys: str) -> None:
        for key in keys:
            self._store.pop(key, None)

    async def aclose(self) -> None:
        self._store.clear()


class RedisClient:
    """异步 Redis 客户端单例封装"""

    _client: Optional[aioredis.Redis] = None

    @classmethod
    def get_client(cls):
        """获取（惰性创建）Redis 客户端；按配置选择真实或内存后端。"""
        if cls._client is None:
            if settings.redis_use_memory:
                cls._client = _InMemoryRedis()
            else:
                cls._client = aioredis.from_url(
                    settings.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
        return cls._client

    @classmethod
    async def set(cls, key: str, value: str, expire: Optional[int] = None) -> None:
        """写入键值，可选过期秒数。"""
        await cls.get_client().set(key, value, ex=expire)

    @classmethod
    async def get(cls, key: str) -> Optional[str]:
        """读取键值，不存在返回 None。"""
        return await cls.get_client().get(key)

    @classmethod
    async def delete(cls, *keys: str) -> None:
        """删除一个或多个键。"""
        if keys:
            await cls.get_client().delete(*keys)

    @classmethod
    async def close(cls) -> None:
        """关闭连接（应用关闭时调用）。"""
        if cls._client is not None:
            await cls._client.aclose()
            cls._client = None


async def get_redis() -> aioredis.Redis:
    """FastAPI 依赖：获取 Redis 客户端。"""
    return RedisClient.get_client()
