// TODO  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2T0dWTFl3PT06MWYwNTVmNjE=

import { test, expect } from '@playwright/test';
// NOTE  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2T0dWTFl3PT06MWYwNTVmNjE=

const BASE_URL = 'https://petstore.swagger.io/v2';

/**
 * 测试套件：DELETE /pet/{petId}
 * 
 * 覆盖场景：
 * - TC-001: 正常删除已存在的宠物 (P0)
 * - TC-002: 删除不存在的宠物 (P1)
 * - TC-003: 无效 petId 类型（非数字）(P1)
 * - TC-004: 带 api_key 请求头删除宠物 (P1)
 * - TC-005: 无 api_key 请求头 (P2)
 * - TC-006: 负值 petId (P2)
 * - TC-007: 超大 petId (P2)
 * - TC-008: 重复删除同一宠物 (P2)
 */

// 测试辅助函数：创建测试宠物
async function createTestPet(apiContext: any, petId: number, name: string, status: string = 'available') {
  const response = await apiContext.post(`${BASE_URL}/pet`, {
    data: {
      id: petId,
      name: name,
      status: status,
      category: { id: 0, name: 'test' },
      photoUrls: ['https://example.com/photo.jpg'],
      tags: [{ id: 0, name: 'test-tag' }],
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });
  expect(response.status()).toBe(200);
  return response;
}
// @ts-expect-error  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2T0dWTFl3PT06MWYwNTVmNjE=

// 测试辅助函数：验证宠物是否存在
async function petExists(apiContext: any, petId: number): Promise<boolean> {
  const response = await apiContext.get(`${BASE_URL}/pet/${petId}`);
  return response.status() === 200;
}
// TODO  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2T0dWTFl3PT06MWYwNTVmNjE=

test.describe('DELETE /pet/{petId} - 删除宠物接口测试', () => {

  test.describe('P0 - 核心功能', () => {
    test('TC-001: 正常删除已存在的宠物', async ({ request }) => {
      // 1. 先创建一个测试宠物
      const testPetId = 123456789;
      await createTestPet(request, testPetId, 'test-dog', 'available');

      // 验证宠物已存在
      expect(await petExists(request, testPetId)).toBeTruthy();

      // 2. 发送 DELETE 请求删除宠物
      const deleteResponse = await request.delete(`${BASE_URL}/pet/${testPetId}`);
      expect(deleteResponse.status()).toBe(200);

      // 3. 验证宠物已被删除
      expect(await petExists(request, testPetId)).toBeFalsy();
    });
  });

  test.describe('P1 - 重要功能', () => {
    test('TC-002: 删除不存在的宠物应返回 404', async ({ request }) => {
      const nonExistentPetId = 999999999;

      const response = await request.delete(`${BASE_URL}/pet/${nonExistentPetId}`);
      expect(response.status()).toBe(404);
    });

    test('TC-003: 无效 petId 类型（非数字）应返回 400', async ({ request }) => {
      // 使用字符串 "abc" 作为 petId
      const response = await request.delete(`${BASE_URL}/pet/abc`);
      // 非数字路径参数可能返回 400 或 404，取决于服务端实现
      expect([400, 404, 405]).toContain(response.status());
    });

    test('TC-004: 带 api_key 请求头删除宠物', async ({ request }) => {
      const testPetId = 123456790;
      await createTestPet(request, testPetId, 'test-cat', 'pending');

      const response = await request.delete(`${BASE_URL}/pet/${testPetId}`, {
        headers: {
          'api_key': 'test-api-key-123',
        },
      });
      expect(response.status()).toBe(200);

      // 验证已删除
      expect(await petExists(request, testPetId)).toBeFalsy();
    });
  });

  test.describe('P2 - 边界与异常', () => {
    test('TC-005: 无 api_key 请求头仍可正常删除', async ({ request }) => {
      const testPetId = 123456791;
      await createTestPet(request, testPetId, 'test-bird', 'available');

      // 不传 api_key 头
      const response = await request.delete(`${BASE_URL}/pet/${testPetId}`);
      expect(response.status()).toBe(200);

      expect(await petExists(request, testPetId)).toBeFalsy();
    });

    test('TC-006: 负值 petId 应返回错误', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/pet/-1`);
      // 负值 ID 应返回 400 或 404
      expect([400, 404]).toContain(response.status());
    });

    test('TC-007: 超大 petId', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/pet/9999999999999`);
      // 超大值通常视为不存在的宠物
      expect(response.status()).toBe(404);
    });

    test('TC-008: 重复删除同一宠物', async ({ request }) => {
      const testPetId = 123456792;
      await createTestPet(request, testPetId, 'test-fish', 'sold');

      // 第一次删除
      const firstResponse = await request.delete(`${BASE_URL}/pet/${testPetId}`);
      expect(firstResponse.status()).toBe(200);

      // 第二次删除 - 应该返回 404（已删除）
      const secondResponse = await request.delete(`${BASE_URL}/pet/${testPetId}`);
      expect(secondResponse.status()).toBe(404);
    });
  });
});
