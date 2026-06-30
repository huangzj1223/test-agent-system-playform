// FIXME  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2ZDJrelF3PT06YzMzNDA1ZTg=

import { test, expect } from '@playwright/test';
// NOTE  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2ZDJrelF3PT06YzMzNDA1ZTg=

const BASE_URL = 'https://petstore.swagger.io/v2';

// 测试辅助函数：生成唯一的宠物 ID
function generatePetId(): number {
  return Math.floor(Math.random() * 100000) + Date.now();
}
// FIXME  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2ZDJrelF3PT06YzMzNDA1ZTg=

// 测试辅助函数：构建标准宠物对象
function createTestPet(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: generatePetId(),
    category: { id: 1, name: 'Dogs' },
    name: 'TestBuddy',
    photoUrls: ['https://example.com/photo1.jpg'],
    tags: [{ id: 1, name: 'friendly' }],
    status: 'available',
    ...overrides,
  };
}

test.describe('POST /pet - Add a new pet to the store', () => {
  // ============ 正向测试 ============

  test('TC-01: 使用完整字段创建宠物（正常流程）', async ({ request }) => {
    const petData = createTestPet({ name: '完整字段测试宠物' });

    const response = await request.post(`${BASE_URL}/pet`, {
      data: petData,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Petstore 返回 200 OK 表示成功
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    console.log(`响应数据: ${JSON.stringify(responseBody)}`);

    // 验证关键字段
    expect(responseBody.id).toBe(petData.id);
    expect(responseBody.name).toBe(petData.name);
    expect(responseBody.status).toBe(petData.status);
    expect(responseBody.category.id).toBe(petData.category.id);
    expect(responseBody.category.name).toBe(petData.category.name);
    expect(responseBody.photoUrls).toContain(petData.photoUrls[0]);
    expect(responseBody.tags[0].id).toBe(petData.tags[0].id);
    expect(responseBody.tags[0].name).toBe(petData.tags[0].name);
  });

  test('TC-02: 仅使用必填字段创建宠物', async ({ request }) => {
    const petId = generatePetId();
    const minimalPet = {
      id: petId,
      name: 'MinimalPet',
      photoUrls: [],
    };

    const response = await request.post(`${BASE_URL}/pet`, {
      data: minimalPet,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('MinimalPet');
    expect(body.photoUrls).toEqual([]);
    console.log(`最小必填字段测试通过，ID: ${body.id}`);
  });

  // ============ 枚举/状态测试 ============

  test('TC-03: 验证所有有效的 status 枚举值', async ({ request }) => {
    const statusValues = ['available', 'pending', 'sold'];

    for (const status of statusValues) {
      const petData = createTestPet({
        name: `StatusTest-${status}`,
        status: status,
      });

      const response = await request.post(`${BASE_URL}/pet`, {
        data: petData,
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBe(status);
      console.log(`Status '${status}' 测试通过`);
    }
  });

  // ============ 边界值测试 ============

  test('TC-08: 创建带有多个 photoUrls 的宠物', async ({ request }) => {
    const petData = createTestPet({
      name: '多照片宠物',
      photoUrls: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg',
      ],
    });

    const response = await request.post(`${BASE_URL}/pet`, {
      data: petData,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.photoUrls).toEqual(
      expect.arrayContaining(petData.photoUrls)
    );
    expect(body.photoUrls.length).toBe(3);
  });

  test('TC-09: 创建带有多个 tags 的宠物', async ({ request }) => {
    const petData = createTestPet({
      name: '多标签宠物',
      tags: [
        { id: 1, name: 'friendly' },
        { id: 2, name: 'trained' },
        { id: 3, name: 'vaccinated' },
      ],
    });

    const response = await request.post(`${BASE_URL}/pet`, {
      data: petData,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.tags.length).toBe(3);
    expect(body.tags[0].name).toBe('friendly');
    expect(body.tags[1].name).toBe('trained');
    expect(body.tags[2].name).toBe('vaccinated');
  });

  // ============ 负面测试 ============

  test('TC-04: 缺少必填字段 name', async ({ request }) => {
    const invalidPet = {
      id: generatePetId(),
      photoUrls: ['https://example.com/photo.jpg'],
      // name 字段缺失
    };

    const response = await request.post(`${BASE_URL}/pet`, {
      data: invalidPet,
      headers: { 'Content-Type': 'application/json' },
    });

    // Petstore 可能返回 405 或其他错误码
    console.log(`缺少 name 字段，响应状态码: ${response.status()}`);
    const body = await response.text();
    console.log(`响应内容: ${body}`);

    // 验证返回非 2xx 状态码
    expect(response.status()).not.toBe(200);
  });

  test('TC-05: 发送空请求体', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/pet`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`空请求体，响应状态码: ${response.status()}`);
    const body = await response.text();
    console.log(`响应内容: ${body}`);

    expect(response.status()).not.toBe(200);
  });

  test('TC-06: 使用无效的 status 枚举值', async ({ request }) => {
    const petData = createTestPet({
      name: '无效状态宠物',
      status: 'unknown_status_value',
    });

    const response = await request.post(`${BASE_URL}/pet`, {
      data: petData,
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`无效 status，响应状态码: ${response.status()}`);
    const body = await response.text();
    console.log(`响应内容: ${body}`);

    // Petstore 可能接受也可能拒绝无效枚举，记录结果
    if (response.status() === 200) {
      const json = JSON.parse(body);
      console.log(`服务端接受了无效枚举值，返回 status: ${json.status}`);
    }
  });

  test('TC-07: name 字段超长字符串', async ({ request }) => {
    const longName = 'A'.repeat(2000);
    const petData = createTestPet({ name: longName });

    const response = await request.post(`${BASE_URL}/pet`, {
      data: petData,
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`超长 name，响应状态码: ${response.status()}`);

    if (response.status() === 200) {
      const body = await response.json();
      console.log(`返回的 name 长度: ${body.name.length}`);
      // 验证 name 没有被截断
      expect(body.name.length).toBe(2000);
    } else {
      console.log(`服务端拒绝了超长 name`);
    }
  });

  test('TC-10: 发送非 JSON 格式数据', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/pet`, {
      data: '这不是JSON格式的数据',
      headers: { 'Content-Type': 'text/plain' },
    });

    console.log(`非 JSON 数据，响应状态码: ${response.status()}`);
    const body = await response.text();
    console.log(`响应内容: ${body}`);

    // 期望返回 4xx 错误
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
// @ts-expect-error  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2ZDJrelF3PT06YzMzNDA1ZTg=
