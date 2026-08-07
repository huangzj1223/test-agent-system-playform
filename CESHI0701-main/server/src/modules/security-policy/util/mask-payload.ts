/**
 * 敏感载荷脱敏工具
 *
 * 审计日志与审批工单共享同一套脱敏逻辑，保证落库的 payload 不含明文敏感值。
 * 双层脱敏：
 * 1. 命中敏感键名（password/token/secret/apiKey/credential 等）的值整体替换为掩码；
 * 2. 对其余字符串值扫描敏感子串（如 api_key=xxx / token: xxx / sk-xxx），仅替换敏感片段。
 * 第 2 层覆盖"敏感值嵌在自由文本里"（如记忆内容 content）的场景，避免明文入审计/工单。
 */

/** 敏感键名匹配：password/pwd/token/secret/apiKey/api_key/credential */
const SENSITIVE_KEYS = /pass|pwd|token|secret|api[_-]?key|credential/i;

/** 掩码占位符 */
const MASK = '***';

/** 值内敏感赋值片段：key=value / key: value（key 命中敏感词），仅掩码 value 部分 */
const SENSITIVE_ASSIGN = /(pass\w*|pwd|token|secret|api[_-]?key|credential)(\s*[=:]\s*)(\S+)/gi;
/** 常见密钥令牌格式：sk-开头（OpenAI 风格）等，整体掩码 */
const SENSITIVE_TOKEN = /\b(sk-[A-Za-z0-9]{6,})\b/g;

/** 对单个字符串值做子串级敏感脱敏 */
function maskStringValue(s: string): string {
  return s
    .replace(SENSITIVE_ASSIGN, (_m, key, sep) => `${key}${sep}${MASK}`)
    .replace(SENSITIVE_TOKEN, MASK);
}

/**
 * 对 payload 做敏感脱敏：顶层敏感键名整体掩码；字符串值再做子串级敏感脱敏。
 * @param payload 原始载荷，可空
 * @returns 脱敏后的新对象；入参为空时返回 null（供 Prisma 可空 Json 字段使用）
 */
export function maskPayload(
  payload?: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!payload) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = MASK;
    } else if (typeof v === 'string') {
      out[k] = maskStringValue(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
