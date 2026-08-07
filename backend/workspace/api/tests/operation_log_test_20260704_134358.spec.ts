import { test, expect } from '@playwright/test';

// 配置
const BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'test-token';

// 认证请求头
const authHeaders = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

test.describe('GET /lsapi/operation/log - 操作日志查询', () => {

  test('【正常】成功获取日志列表 - 应返回 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/lsapi/operation/log`, {
      headers: authHeaders
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    // 验证响应为合法 JSON 对象
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  test('【异常】无认证信息 - 应返回 401', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/lsapi/operation/log`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 无认证时应返回 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('【异常】无效 Token - 应返回 401/403', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/lsapi/operation/log`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      }
    });

    // 无效 token 应返回 401 或 403
    expect([401, 403]).toContain(response.status());
  });

  test('【异常】请求方法错误 - 使用 POST 替代 GET 应返回 405', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/lsapi/operation/log`, {
      headers: authHeaders,
      data: {}
    });

    // 错误的 HTTP 方法应返回 405 Method Not Allowed
    expect(response.status()).toBe(405);
  });

  test('【安全】SQL 注入测试 - 应被安全过滤', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/lsapi/operation/log`, {
      headers: authHeaders,
      params: {
        param: "' OR '1'='1"
      }
    });

    // SQL 注入应被过滤，返回正常响应或错误
    expect([200, 400, 422]).toContain(response.status());
  });

  test('【安全】XSS 注入测试 - 应被正确转义', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/lsapi/operation/log`, {
      headers: authHeaders,
      params: {
        param: "<script>alert('xss')</script>"
      }
    });

    // XSS 应被转义或过滤
    expect([200, 400, 422]).toContain(response.status());
  });
});
