// FIXME  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VFhWU2JBPT06NTFkYWJmYmM=

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://petstore.swagger.io/v2';
// eslint-disable  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VFhWU2JBPT06NTFkYWJmYmM=

test.describe('DELETE /pet/{petId} - 删除宠物', () => {

  test('P0 - 删除不存在的宠物 - 404', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/99999999`);
    expect(response.status()).toBe(404);
  });

  test('P0 - 无效 petId（负数）- 404', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/-1`);
    expect(response.status()).toBe(404);
  });

  test('P0 - 超大 petId - 404', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/9999999999999`);
    expect(response.status()).toBe(404);
  });

  test('P1 - 带 api_key 请求头删除 - 200', async ({ request }) => {
    // 带 api_key 时 petId=12345 返回 200（删除成功）
    const response = await request.delete(`${BASE_URL}/pet/12345`, {
      headers: {
        'api_key': 'test-api-key'
      }
    });
    expect(response.status()).toBe(200);
  });

  test('P1 - 重复删除同一 petId - 幂等性', async ({ request }) => {
    const petId = '88888888';
    const firstResp = await request.delete(`${BASE_URL}/pet/${petId}`);
    const secondResp = await request.delete(`${BASE_URL}/pet/${petId}`);
    // 幂等性：两次删除应返回相同结果
    expect(secondResp.status()).toBe(firstResp.status());
  });

});
