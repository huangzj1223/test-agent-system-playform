import { isIP } from 'net';
import { lookup } from 'dns/promises';

/**
 * 出站 URL 安全校验（SSRF 防护）
 *
 * 服务端主动向用户提供的地址发起请求前，必须先经此校验，
 * 阻断指向环回 / 私有 / 链路本地 / 云元数据等内网地址的请求，
 * 防止管理员（即便有配置权限）借测试连接探测或访问内网资源。
 */

/**
 * 将 IPv6 地址展开为 8 组 16 位整数（处理 :: 压缩与内嵌点分 IPv4）
 * @param ip 去方括号的 IPv6 字符串（小写）
 * @returns 长度 8 的组数组；解析失败返回 null
 */
function expandIpv6(ip: string): number[] | null {
  let s = ip;
  // 处理内嵌点分 IPv4（如 ::ffff:127.0.0.1 / ::127.0.0.1），转为两组 hex
  const dotted = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dotted) {
    const p = dotted[1].split('.').map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n > 255)) return null;
    const hex = `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
    s = s.slice(0, dotted.index) + hex;
  }

  // 处理 :: 压缩：左右两半，中间补 0
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : [];
  let groups: string[];
  if (halves.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill('0'), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;

  const nums = groups.map((g) => (g === '' ? 0 : parseInt(g, 16)));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return nums;
}

/**
 * 判断 IPv4/IPv6 地址是否属于内网/保留段（应被拒绝）
 * @param ip IP 字符串
 * @returns 命中内网/保留段返回 true
 */
function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split('.').map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    // 环回 127/8、私有 10/8、172.16-31、192.168、链路本地 169.254、0.0.0.0/8
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }
  if (v === 6) {
    const g = expandIpv6(ip.toLowerCase());
    // 无法解析的 IPv6 视为不安全
    if (!g) return true;

    // 内嵌 IPv4（IPv4-mapped ::ffff:x / IPv4-compatible ::x）：前 5 组为 0，
    // 第 6 组为 0 或 0xffff → 用末两组还原 IPv4 递归判断（防 [::127.0.0.1] 类绕过）
    const firstFiveZero = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0;
    if (firstFiveZero && (g[5] === 0 || g[5] === 0xffff)) {
      const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
      // ::（全 0）与 ::1（环回）也会落入此分支，一并按内网处理
      return isPrivateIp(v4) || (g[5] === 0 && g[6] === 0);
    }

    // ::1 环回、:: 未指定
    if (g.every((n, i) => (i < 7 ? n === 0 : true)) && (g[7] === 0 || g[7] === 1)) {
      return true;
    }
    // fc00::/7 唯一本地地址
    if ((g[0] & 0xfe00) === 0xfc00) return true;
    // fe80::/10 链路本地
    if ((g[0] & 0xffc0) === 0xfe80) return true;
    return false;
  }
  // 非法 IP 一律视为不安全
  return true;
}

/**
 * 校验出站地址安全：协议须为 http/https，主机解析出的所有 IP 均不得为内网地址
 * @param rawUrl 待校验的 URL
 * @throws 协议非法、主机为内网地址或无法解析时抛出错误
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('地址格式非法');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('仅支持 http/https 协议');
  }

  // IPv6 字面量的 hostname 带方括号（如 [::1]），剥离后再判定
  const rawHost = url.hostname;
  const host =
    rawHost.startsWith('[') && rawHost.endsWith(']')
      ? rawHost.slice(1, -1)
      : rawHost;

  // 显式拒绝 localhost 别名
  if (host.toLowerCase() === 'localhost') {
    throw new Error('禁止访问内网地址');
  }

  // 主机若为 IP 直接判定；否则解析出所有 IP 逐一判定（防 DNS 重绑定/内网域名）
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error('禁止访问内网地址');
    return;
  }

  const records = await lookup(host, { all: true });
  if (!records.length) {
    throw new Error('无法解析主机地址');
  }
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error('禁止访问内网地址');
    }
  }
}
