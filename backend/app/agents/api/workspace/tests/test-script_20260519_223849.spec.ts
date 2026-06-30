// @ts-expect-error  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2TmpCR1VRPT06OTY0ODE0OWE=

/**
 * DELETE /pet/{petId} - 删除宠物 API 测试
 * 项目：https://petstore.swagger.io/v2
 * 框架：Playwright
 *
 * 测试覆盖：正向测试、参数异常、业务逻辑、边界值
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://petstore.swagger.io/v2';
// @ts-expect-error  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2TmpCR1VRPT06OTY0ODE0OWE=

// ============================
// 辅助函数
// ============================

/**
 * 创建一个测试宠物并返回 petId
 */
async function createTestPet(request: any, petData: any): Promise<number> {
  const response = await request.post(`${BASE_URL}/pet`, {
    data: petData,
    headers: { 'Content-Type': 'application/json' }
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.id;
}
// TODO  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2TmpCR1VRPT06OTY0ODE0OWE=

const DEFAULT_PET = {
  id: 123456789,
  name: 'TestDog',
  photoUrls: ['https://example.com/dog.jpg'],
  status: 'available'
};

// ============================
// 测试套件
// ============================
// eslint-disable  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2TmpCR1VRPT06OTY0ODE0OWE=

test.describe('DELETE /pet/{petId} - 删除宠物 API', () => {

  // ========== 正向测试 ==========

  test('TC-01: 删除存在的宠物 - 有效 petId', async ({ request }) => {
    // 先创建宠物
    const petId = await createTestPet(request, { ...DEFAULT_PET, id: Date.now() });

    // 执行删除
    const deleteResponse = await request.delete(`${BASE_URL}/pet/${petId}`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // 验证删除成功
    expect(deleteResponse.status()).toBe(200);
  });

  test('TC-02: 使用 api_key header 删除宠物', async ({ request }) => {
    // 先创建宠物
    const petId = await createTestPet(request, { ...DEFAULT_PET, id: Date.now() + 1, name: 'TestCat' });

    // 执行删除（携带 api_key）
    const deleteResponse = await request.delete(`${BASE_URL}/pet/${petId}`, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': 'test-api-key'
      }
    });

    // 验证删除成功
    expect(deleteResponse.status()).toBe(200);
  });

  // ========== 参数异常测试 ==========

  test('TC-03: petId 为 0（边界值）', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/0`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // 实际行为：Petstore 将 petId=0 视为不存在的宠物，返回 404
    expect(response.status()).toBe(404);
  });

  test('TC-04: petId 为负数', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/-1`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // 预期：400 或 404
    const status = response.status();
    expect([400, 404]).toContain(status);
  });

  test('TC-05: petId 为极大值（不存在）', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/99999999999`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // 预期：404 Pet not found
    expect(response.status()).toBe(404);
  });

  test('TC-06: petId 为字符串', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/abc`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // 实际行为：Petstore 将字符串 petId 视为不存在的宠物，返回 404
    expect(response.status()).toBe(404);
  });

  test('TC-07: petId 为浮点数', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/1.5`, {
      headers: { 'Content-Type': 'application/json' }
    });

    // 预期：400 或 404
    const status = response.status();
    expect([400, 404]).toContain(status);
  });

  // ========== 业务逻辑测试 ==========

  test('TC-08: 重复删除同一宠物（幂等性测试）', async ({ request }) => {
    // 先创建宠物
    const petId = await createTestPet(request, { ...DEFAULT_PET, id: Date.now() + 2, name: 'RepeatDog' });

    // 第一次删除 - 应成功
    const firstResponse = await request.delete(`${BASE_URL}/pet/${petId}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    expect(firstResponse.status()).toBe(200);

    // 第二次删除 - 宠物已不存在，应 404
    const secondResponse = await request.delete(`${BASE_URL}/pet/${petId}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    expect(secondResponse.status()).toBe(404);
  });

});
