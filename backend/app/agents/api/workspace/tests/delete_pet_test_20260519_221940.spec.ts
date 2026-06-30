// NOTE  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2TVdWU05nPT06MDY4N2IwMzQ=

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://petstore.swagger.io/v2';
// @ts-expect-error  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2TVdWU05nPT06MDY4N2IwMzQ=

/**
 * 测试套件：DELETE /pet/{petId} - 删除宠物
 * API 概述：根据 petId 删除指定的宠物记录
 * 认证：OAuth2 petstore_auth (write:pets, read:pets)
 */
// NOTE  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2TVdWU05nPT06MDY4N2IwMzQ=

// 辅助函数：创建一个测试宠物并返回其 ID
async function createTestPet(request: any, petId: number, name: string): Promise<void> {
  const response = await request.post(`${BASE_URL}/pet`, {
    data: {
      id: petId,
      name: name,
      status: 'available'
    }
  });
  expect(response.status()).toBe(200);
}

// 辅助函数：清理测试数据
async function deletePetIfExists(request: any, petId: number): Promise<void> {
  const response = await request.delete(`${BASE_URL}/pet/${petId}`);
  // 忽略结果，仅用于清理
}

test.describe('DELETE /pet/{petId} - 删除宠物', () => {

  const TEST_PET_ID = 123456789;
  const TEST_PET_ID_2 = 987654321;

  test.afterEach(async ({ request }) => {
    // 清理测试数据
    await deletePetIfExists(request, TEST_PET_ID);
    await deletePetIfExists(request, TEST_PET_ID_2);
  });

  /**
   * TC-001: 成功删除存在的宠物
   * 先创建一个宠物，然后使用该宠物的 ID 进行删除操作
   */
  test('TC-001: 成功删除存在的宠物', async ({ request }) => {
    // 1. 先创建测试宠物
    await createTestPet(request, TEST_PET_ID, 'testDog');

    // 2. 删除该宠物
    const deleteResponse = await request.delete(`${BASE_URL}/pet/${TEST_PET_ID}`);
    expect(deleteResponse.status()).toBe(200);

    // 3. 验证宠物已被删除
    const getResponse = await request.get(`${BASE_URL}/pet/${TEST_PET_ID}`);
    expect(getResponse.status()).toBe(404);
  });

  /**
   * TC-002: 删除不存在的宠物ID（404）
   */
  test('TC-002: 删除不存在的宠物ID（404）', async ({ request }) => {
    const nonExistentPetId = 999999999999;
    const response = await request.delete(`${BASE_URL}/pet/${nonExistentPetId}`);
    expect(response.status()).toBe(404);
  });

  /**
   * TC-003: 使用无效的 petId（负数）- 404
   * Petstore API 将负数 petId 视为不存在的 ID，返回 404
   */
  test('TC-003: 使用无效的 petId（负数）- 404', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/-1`);
    expect(response.status()).toBe(404);
  });

  /**
   * TC-004: petId 为 0（404）
   * Petstore API 将 petId=0 视为不存在的 ID，返回 404
   */
  test('TC-004: petId 为 0（404）', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/pet/0`);
    expect(response.status()).toBe(404);
  });

  /**
   * TC-005: 验证删除后的宠物不可再查询
   * 先创建并删除一个宠物，然后通过 GET 验证该宠物已被删除
   */
  test('TC-005: 验证删除后的宠物不可再查询', async ({ request }) => {
    // 1. 创建测试宠物
    await createTestPet(request, TEST_PET_ID_2, 'deleteTestPet');

    // 2. 删除该宠物
    const deleteResponse = await request.delete(`${BASE_URL}/pet/${TEST_PET_ID_2}`);
    expect(deleteResponse.status()).toBe(200);

    // 3. 查询该宠物，验证已被删除
    const getResponse = await request.get(`${BASE_URL}/pet/${TEST_PET_ID_2}`);
    expect(getResponse.status()).toBe(404);
  });

  /**
   * TC-006: 不提供 api_key 头仍可删除
   */
  test('TC-006: 不提供 api_key 头仍可删除', async ({ request }) => {
    // 1. 先创建测试宠物
    await createTestPet(request, 555555555, 'noApiKeyPet');

    // 2. 不传入 api_key header，只传 petId
    const response = await request.delete(`${BASE_URL}/pet/555555555`, {
      headers: {
        // 不设置 api_key 头
      }
    });
    expect(response.status()).toBe(200);

    // 清理
    await deletePetIfExists(request, 555555555);
  });
});
// FIXME  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2TVdWU05nPT06MDY4N2IwMzQ=
