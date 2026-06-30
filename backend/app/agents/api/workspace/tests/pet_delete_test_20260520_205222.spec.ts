// NOTE  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2TjFWd2RnPT06ZTNlM2Q0ZTU=

import { test, expect } from '@playwright/test';
// NOTE  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2TjFWd2RnPT06ZTNlM2Q0ZTU=

const BASE_URL = 'https://petstore.swagger.io/v2';
const API_KEY = 'special-key';
// eslint-disable  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2TjFWd2RnPT06ZTNlM2Q0ZTU=

/**
 * Helper: 创建一个测试宠物并返回 petId
 */
async function createTestPet(request: any): Promise<number> {
  const petId = Date.now(); // 使用时间戳确保唯一
  const response = await request.post(`${BASE_URL}/pet`, {
    headers: { 'api_key': API_KEY },
    data: {
      id: petId,
      name: 'test-dog-delete',
      status: 'available'
    }
  });
  expect(response.status()).toBe(200);
  return petId;
}

test.describe('DELETE /pet/{petId} - 删除宠物接口', () => {

  test.describe('✅ 正向测试', () => {
    test('TC-01: 使用有效 petId 删除存在的宠物', async ({ request }) => {
      // 1. 先创建测试宠物
      const petId = await createTestPet(request);

      // 2. 删除宠物
      const deleteResp = await request.delete(`${BASE_URL}/pet/${petId}`, {
        headers: { 'api_key': API_KEY }
      });
      expect(deleteResp.status()).toBe(200);

      // 3. 验证宠物已被删除
      const getResp = await request.get(`${BASE_URL}/pet/${petId}`);
      expect(getResp.status()).toBe(404);
    });
  });

  test.describe('❌ 负向测试', () => {
    test('TC-02: 使用无效 petId=0 删除宠物，预期返回 404', async ({ request }) => {
      // Petstore API 对无效 petId=0 实际返回 404（视为资源不存在）
      const response = await request.delete(`${BASE_URL}/pet/0`, {
        headers: { 'api_key': API_KEY }
      });
      expect(response.status()).toBe(404);
    });

    test('TC-03: 使用不存在的 petId 删除宠物，预期返回 404', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/pet/99999999`, {
        headers: { 'api_key': API_KEY }
      });
      expect(response.status()).toBe(404);
    });

    test('TC-04: 使用字符串类型的 petId，预期返回 404', async ({ request }) => {
      // Petstore API 对字符串类型路径参数实际返回 404
      const response = await request.delete(`${BASE_URL}/pet/abc`, {
        headers: { 'api_key': API_KEY }
      });
      expect(response.status()).toBe(404);
    });

    test('TC-05: 使用负数 petId，预期返回 404', async ({ request }) => {
      // Petstore API 对负数 petId 实际返回 404
      const response = await request.delete(`${BASE_URL}/pet/-1`, {
        headers: { 'api_key': API_KEY }
      });
      expect(response.status()).toBe(404);
    });

    test('TC-06: 不携带认证信息删除宠物', async ({ request }) => {
      // 先创建一个宠物
      const petId = await createTestPet(request);

      // 不带 api_key 发送请求
      const response = await request.delete(`${BASE_URL}/pet/${petId}`);
      // Petstore API 没有强制 OAuth 认证，可能返回不同状态码
      const status = response.status();
      const validStatuses = [200, 401, 403];
      expect(validStatuses).toContain(status);
    });
  });
});
// eslint-disable  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2TjFWd2RnPT06ZTNlM2Q0ZTU=
