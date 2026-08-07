"""Encryption helpers for model configuration secrets."""

import base64
import hashlib
import hmac
import secrets

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:  # pragma: no cover - local fallback for environments without cryptography
    AESGCM = None


def _derive_key(secret: str) -> bytes:
    if not secret:
        raise ValueError("model_config_enc_key is required")
    return hashlib.sha256(secret.encode("utf-8")).digest()


def _keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    chunks: list[bytes] = []
    counter = 0
    while sum(len(chunk) for chunk in chunks) < length:
        chunks.append(hashlib.sha256(key + nonce + counter.to_bytes(4, "big")).digest())
        counter += 1
    return b"".join(chunks)[:length]


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _unb64(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _encrypt_v1(plain_text: str, secret: str) -> str:
    if plain_text == "":
        raise ValueError("plain_text must not be empty")
    key = _derive_key(secret)
    nonce = secrets.token_bytes(16)
    plain = plain_text.encode("utf-8")
    stream = _keystream(key, nonce, len(plain))
    cipher = bytes(left ^ right for left, right in zip(plain, stream))
    tag = hmac.new(key, nonce + cipher, hashlib.sha256).digest()
    return f"v1.{_b64(nonce)}.{_b64(cipher)}.{_b64(tag)}"


def _decrypt_v1(cipher_text: str, secret: str) -> str:
    try:
        version, nonce_part, cipher_part, tag_part = cipher_text.split(".", 3)
    except ValueError as exc:
        raise ValueError("invalid cipher text") from exc
    if version != "v1":
        raise ValueError("unsupported cipher text version")

    key = _derive_key(secret)
    nonce = _unb64(nonce_part)
    cipher = _unb64(cipher_part)
    tag = _unb64(tag_part)
    expected = hmac.new(key, nonce + cipher, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected):
        raise ValueError("invalid cipher text tag")
    stream = _keystream(key, nonce, len(cipher))
    plain = bytes(left ^ right for left, right in zip(cipher, stream))
    return plain.decode("utf-8")


def encrypt_secret(plain_text: str, secret: str) -> str:
    """Encrypt a secret using AES-256-GCM for database storage."""
    if plain_text == "":
        raise ValueError("plain_text must not be empty")
    if AESGCM is None:
        return _encrypt_v1(plain_text, secret)
    key = _derive_key(secret)
    nonce = secrets.token_bytes(12)
    cipher = AESGCM(key).encrypt(nonce, plain_text.encode("utf-8"), None)
    return f"v2.{_b64(nonce)}.{_b64(cipher)}"


def decrypt_secret(cipher_text: str, secret: str) -> str:
    """Decrypt a secret encrypted by encrypt_secret."""
    if cipher_text.startswith("v1."):
        return _decrypt_v1(cipher_text, secret)
    try:
        version, nonce_part, cipher_part = cipher_text.split(".", 2)
    except ValueError as exc:
        raise ValueError("invalid cipher text") from exc
    if version != "v2":
        raise ValueError("unsupported cipher text version")
    if AESGCM is None:
        raise ValueError("AES-GCM support is not available")
    plain = AESGCM(_derive_key(secret)).decrypt(_unb64(nonce_part), _unb64(cipher_part), None)
    return plain.decode("utf-8")
