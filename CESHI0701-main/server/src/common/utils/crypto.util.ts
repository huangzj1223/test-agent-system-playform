import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

/**
 * 敏感数据对称加密工具（AES-256-GCM）
 *
 * 用于加密存储 API Key 等敏感凭证。加密密钥由外部传入的口令（来自环境变量
 * MODEL_CONFIG_ENC_KEY）经 scrypt 派生为 32 字节，支持任意长度口令。
 * 密文格式：base64(iv) : base64(authTag) : base64(cipherText)，三段以冒号分隔，
 * 自带随机 IV 与认证标签，可抵御密文篡改。
 *
 * 安全约束：
 * - 明文（API Key）仅在内存中短暂存在，绝不落盘为明文、绝不进入日志与 HTTP 响应；
 * - 口令缺失时直接抛错，不降级为明文存储。
 */

/** GCM 推荐 IV 长度（字节） */
const IV_LENGTH = 12;
/** 派生密钥长度（AES-256 需 32 字节） */
const KEY_LENGTH = 32;
/** 默认 scrypt 派生 salt（可被环境变量 MODEL_CONFIG_ENC_SALT 覆盖以做纵深防御） */
const DEFAULT_KEY_SALT = 'agentpm-model-config-salt';

/** 派生密钥缓存：scrypt 为特意做慢的 KDF，口令+salt 不变则复用，避免高频解密时重复拉伸 */
const keyCache = new Map<string, Buffer>();

/**
 * 由口令派生 32 字节 AES 密钥（带进程内缓存）
 * @param secret 加密口令（环境变量 MODEL_CONFIG_ENC_KEY）
 * @param salt 派生 salt（缺省用 DEFAULT_KEY_SALT）
 * @returns 32 字节密钥
 * @throws 口令为空时抛出错误
 */
function deriveKey(secret: string, salt: string): Buffer {
  if (!secret) {
    throw new Error('加密口令未配置');
  }
  const cacheKey = `${salt}::${secret}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;
  const derived = scryptSync(secret, salt, KEY_LENGTH);
  keyCache.set(cacheKey, derived);
  return derived;
}

/** 读取有效 salt（环境变量优先，回退默认值） */
function resolveSalt(): string {
  return process.env.MODEL_CONFIG_ENC_SALT || DEFAULT_KEY_SALT;
}

/**
 * 加密明文
 * @param plainText 待加密明文（如 API Key）
 * @param secret 加密口令
 * @returns 密文字符串（iv:authTag:cipher，均为 base64）
 */
export function encryptSecret(plainText: string, secret: string): string {
  const key = deriveKey(secret, resolveSalt());
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * 解密密文
 * @param cipherText 密文字符串（encryptSecret 的输出格式）
 * @param secret 加密口令
 * @returns 解密后的明文
 * @throws 格式非法或认证失败（密文被篡改/口令错误）时抛出错误
 */
export function decryptSecret(cipherText: string, secret: string): string {
  const key = deriveKey(secret, resolveSalt());
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('密文格式非法');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
