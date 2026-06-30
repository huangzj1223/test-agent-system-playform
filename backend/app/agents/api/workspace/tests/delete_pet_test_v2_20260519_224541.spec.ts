import { test, expect } from '@playwright/test';
// eslint-disable  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2Wm5GS2JBPT06MjM3OTc0OWE=

const BASE_URL = 'https://petstore.swagger.io/v2';
// eslint-disable  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2Wm5GS2JBPT06MjM3OTc0OWE=

test.describe('DELETE /pet/{petId} - 删除宠物', () => {

  test('P0 - 删除不存在的宠物 - 404', async ({ request }) => {
    // Petstore 测试环境中，大多数 petId 都返回 404（资源不存在）
    const response = await request.delete(`${BASE_URL}/pet/99999999`);
    expect(response.status()).toBe(404);
  });

  test('P0 - 无效 petId（负数）- 404', async ({ request }) => {
    // Petstore API 对负数 petId 返回 404 (Pet not found)
    const response = await request.delete(`${BASE_URL}/pet/-1`);
    expect(response.status()).toBe(404);
  });

  test('P0 - 超大 petId - 404', async ({ request }) => {
    // 超大数值也是不存在的 pet
    const response = await request.delete(`${BASE_URL}/pet/9999999999999`);
    expect(response.status()).toBe(404);
  });

  test('P1 - 带 api_key 请求头删除', async ({ request }) => {
    // 携带 api_key 请求头，验证可选参数兼容性
    const response = await request.delete(`${BASE_URL}/pet/12345`, {
      headers: {
        'api_key': 'test-api-key'
      }
    });
    // 由于 pet 不存在，返回 404
    expect(response.status()).toBe(404);
  });

  test('P1 - 重复删除同一 petId - 幂等性', async ({ request }) => {
    const petId = '88888888';
    // 第一次删除
    const firstResp = await request.delete(`${BASE_URL}/pet/${petId}`);
    // 第二次删除同一 petId
    const secondResp = await request.delete(`${BASE_URL}/pet/${petId}`);
    // 幂等性：两次删除应返回相同结果
    expect(secondResp.status()).toBe(firstResp.status());
  });

});
