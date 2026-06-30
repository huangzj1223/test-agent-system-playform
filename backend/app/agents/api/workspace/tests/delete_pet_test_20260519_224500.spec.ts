// @ts-expect-error  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2WWxWTVJBPT06YTNmM2IxNjg=

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://petstore.swagger.io/v2';
// TODO  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2WWxWTVJBPT06YTNmM2IxNjg=

test.describe('DELETE /pet/{petId} - 删除宠物', () => {

  test('P0 - 正常删除宠物 - 有效 petId', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/12345`);
    expect(response.status()).toBe(200);
  });

  test('P0 - 删除不存在的宠物 - 404', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/99999999`);
    expect(response.status()).toBe(404);
  });

  test('P1 - 无效 petId（负数）- 400', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/-1`);
    expect(response.status()).toBe(400);
  });

  test('P1 - 带 api_key 请求头删除宠物', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/12345`, {
      headers: {
        'api_key': 'test-api-key'
      }
    });
    // api_key 是可选参数，应正常返回
    expect([200, 404]).toContain(response.status());
  });

  test('P1 - 重复删除同一宠物 - 幂等性', async ({ request }) => {
    // 第一次删除（可能成功或已不存在）
    const firstResp = await request.delete(`${BASE_URL}/pet/99999999`);
    // 第二次删除同一 petId
    const secondResp = await request.delete(`${BASE_URL}/pet/99999999`);
    // 两次删除应返回相同结果（幂等性：要么都成功，要么都 404）
    expect(secondResp.status()).toBe(firstResp.status());
  });

});
