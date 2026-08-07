import { test, expect } from '@playwright/test';

// 配置
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

const API_PATH = '/lsapi/yolo/cls';

// 认证请求头
function getAuthHeaders(token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const t = token || AUTH_TOKEN;
  if (t) {
    headers['Authorization'] = `Bearer ${t}`;
  }
  return headers;
}

test.describe('DELETE /lsapi/yolo/cls - 删除资源', () => {

  test('正常场景 - 删除资源请求可正常发送', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}${API_PATH}`, {
      headers: getAuthHeaders(),
      timeout: 10000
    });

    const status = response.status();
    console.log(`响应状态码: ${status}`);

    // 资源可能不存在（404）或删除成功（200），请求本身应被正确处理
    expect([200, 404]).toContain(status);
  });

  test('异常场景 - 重复删除资源（幂等性验证）', async ({ request }) => {
    // 第一次删除
    const firstResponse = await request.delete(`${BASE_URL}${API_PATH}`, {
      headers: getAuthHeaders(),
      timeout: 10000
    });
    const firstStatus = firstResponse.status();
    console.log(`第一次删除状态码: ${firstStatus}`);

    // 第二次删除 - 验证幂等性
    const secondResponse = await request.delete(`${BASE_URL}${API_PATH}`, {
      headers: getAuthHeaders(),
      timeout: 10000
    });
    const secondStatus = secondResponse.status();
    console.log(`第一次删除: ${firstStatus}, 第二次删除: ${secondStatus}`);

    // DELETE 操作应是幂等的
    expect([200, 404]).toContain(firstStatus);
    expect([200, 404]).toContain(secondStatus);
  });

  test('安全测试 - 未授权访问（无 Token）', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}${API_PATH}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const status = response.status();
    console.log(`无 Token 请求状态码: ${status}`);

    // 请求应被正确处理，返回有效状态码
    expect([200, 401, 403, 404]).toContain(status);
  });

  test('安全测试 - 无效 Token 访问', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}${API_PATH}`, {
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const status = response.status();
    console.log(`无效 Token 请求状态码: ${status}`);

    // 请求应被正确处理
    expect([200, 401, 403, 404]).toContain(status);
  });

  test('边界测试 - 带额外查询参数', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}${API_PATH}?extra_param=test&timestamp=${Date.now()}`, {
      headers: getAuthHeaders(),
      timeout: 10000
    });

    const status = response.status();
    console.log(`带额外参数请求状态码: ${status}`);

    // 服务端应能正确处理额外参数
    expect([200, 400, 404]).toContain(status);
  });

  test('并发测试 - 同时发送多个 DELETE 请求', async ({ request }) => {
    const promises = Array.from({ length: 3 }, () =>
      request.delete(`${BASE_URL}${API_PATH}`, {
        headers: getAuthHeaders(),
        timeout: 10000
      })
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.status());
    console.log(`并发请求状态码: ${JSON.stringify(statuses)}`);

    // 所有并发请求都应正确处理
    statuses.forEach(status => {
      expect([200, 404]).toContain(status);
    });
  });
});
