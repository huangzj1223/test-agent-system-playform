// FIXME  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2WmxoUFpnPT06NDhlMjk1YmQ=

import { test, expect } from '@playwright/test';
// NOTE  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2WmxoUFpnPT06NDhlMjk1YmQ=

const BASE_URL = 'https://petstore.swagger.io/v2';
// FIXME  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2WmxoUFpnPT06NDhlMjk1YmQ=

test.describe('GET /pet/findByStatus - 根据状态查找宠物', () => {

  test('P0-1: 查询可用宠物 - status=available', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`, {
      params: { status: 'available' }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    // 验证返回的宠物数据格式
    if (body.length > 0) {
      for (const pet of body) {
        expect(pet).toHaveProperty('id');
        expect(pet).toHaveProperty('name');
        expect(pet).toHaveProperty('status');
      }
    }
  });

  test('P0-2: 查询待处理宠物 - status=pending', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`, {
      params: { status: 'pending' }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    if (body.length > 0) {
      for (const pet of body) {
        expect(pet.status).toBe('pending');
      }
    }
  });

  test('P0-3: 查询已售宠物 - status=sold', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`, {
      params: { status: 'sold' }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    if (body.length > 0) {
      for (const pet of body) {
        expect(pet.status).toBe('sold');
      }
    }
  });

  test('P1-1: 多状态组合查询 - status=available,pending', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`, {
      params: { status: ['available', 'pending'] }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    if (body.length > 0) {
      for (const pet of body) {
        // 验证返回的宠物状态属于查询的范围内
        expect(['available', 'pending']).toContain(pet.status);
      }
    }
  });

  test('P1-2: 无效状态值 - status=invalid_status（API 宽容处理返回 200）', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`, {
      params: { status: 'invalid_status' }
    });
    // Petstore API 对无效状态值宽容处理，实际返回 200（可能为空数组）
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('P1-3: 缺少必填参数 - 不传 status（API 使用默认值返回 200）', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`);
    // Petstore API 对缺失参数使用默认值，实际返回 200
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('P2-1: 空字符串作为状态值 - status=""（API 宽容处理返回 200）', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`, {
      params: { status: '' }
    });
    // Petstore API 对空字符串宽容处理，返回 200
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('P2-2: 所有有效状态值组合 - status=available,pending,sold', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`, {
      params: { status: ['available', 'pending', 'sold'] }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    if (body.length > 0) {
      for (const pet of body) {
        expect(['available', 'pending', 'sold']).toContain(pet.status);
      }
    }
  });

  test('P2-3: 响应结构完整性验证', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/pet/findByStatus`, {
      params: { status: 'available' }
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    if (body.length > 0) {
      const pet = body[0];
      // 验证 Pet 标准字段结构
      expect(pet).toHaveProperty('id');
      expect(pet).toHaveProperty('category');
      expect(pet).toHaveProperty('name');
      expect(pet).toHaveProperty('photoUrls');
      expect(Array.isArray(pet.photoUrls)).toBeTruthy();
      expect(pet).toHaveProperty('tags');
      expect(Array.isArray(pet.tags)).toBeTruthy();
      expect(pet).toHaveProperty('status');
    }
  });

});
// @ts-expect-error  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2WmxoUFpnPT06NDhlMjk1YmQ=
