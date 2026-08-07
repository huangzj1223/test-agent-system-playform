"""
认证安全工具

提供密码哈希（bcrypt）与 JWT 令牌的签发、校验能力。
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import JWTError, jwt

from app.config.settings import settings

# bcrypt cost 因子（与 CESHI0701 一致）
_BCRYPT_ROUNDS = 12
# bcrypt 仅使用密码前 72 字节，超出需显式截断以避免报错
_BCRYPT_MAX_BYTES = 72


def _to_bcrypt_bytes(password: str) -> bytes:
    """将明文密码编码为 bcrypt 可用的字节串（截断到 72 字节）。"""
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    """对明文密码进行 bcrypt 哈希。

    Args:
        password: 明文密码
    Returns:
        哈希后的密码串
    """
    hashed = bcrypt.hashpw(_to_bcrypt_bytes(password), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS))
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """校验明文密码与哈希是否匹配。

    Args:
        plain_password: 明文密码
        password_hash: 数据库中存储的哈希
    Returns:
        是否匹配
    """
    try:
        return bcrypt.checkpw(_to_bcrypt_bytes(plain_password), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_token(payload: dict[str, Any], expires_in: int) -> str:
    """签发 JWT 令牌。

    Args:
        payload: 令牌载荷（不含 exp/iat）
        expires_in: 有效期（秒）
    Returns:
        JWT 字符串
    """
    now = datetime.now(timezone.utc)
    to_encode = {
        **payload,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[dict[str, Any]]:
    """解码并校验 JWT 令牌。

    Args:
        token: JWT 字符串
    Returns:
        载荷字典；无效或过期返回 None
    """
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
