/**
 * 通用 CRUD API 请求封装工具
 * 用于快速创建增删改查的 API 函数
 */

import request from '@/utils/http'
import type { CrudMockResult } from './mockHelper'

export interface CrudApiConfig {
  /** API 基础路径，如 '/admin/user' */
  baseUrl: string
  /** Mock 函数集合 */
  mockFns: CrudMockResult<any>
  /** 是否使用 Mock，默认从环境变量读取 */
  useMock?: boolean
  /** Mock 延迟时间（毫秒），默认 300 */
  mockDelay?: number
}

export interface CrudApiResult<T = any> {
  /** 获取列表 */
  getList: (params?: any) => Promise<any>
  /** 添加数据 */
  add: (data: Partial<T>) => Promise<any>
  /** 更新数据 */
  update: (data: Partial<T>) => Promise<any>
  /** 删除数据 */
  delete: (id: any) => Promise<any>
  /** 批量删除 */
  batchDelete: (ids: any[]) => Promise<any>
  /** 更新状态 */
  updateStatus: (id: any, status: number) => Promise<any>
  /** 获取详情 */
  getDetail: (id: any) => Promise<any>
}

/**
 * 创建通用的 CRUD API 函数
 */
export function createCrudApi<T = any>(config: CrudApiConfig): CrudApiResult<T> {
  const {
    baseUrl,
    mockFns,
    useMock = import.meta.env.VITE_USE_MOCK === 'true',
    mockDelay = 300
  } = config

  /**
   * 创建 Mock Promise
   */
  const createMockPromise = (fn: () => any, successMsg = '操作成功') => {
    return new Promise<any>((resolve, reject) => {
      setTimeout(() => {
        try {
          const data = fn()
          resolve({
            code: 200,
            data,
            message: successMsg
          })
        } catch (error: any) {
          reject({
            code: 500,
            message: error.message || '操作失败'
          })
        }
      }, mockDelay)
    })
  }

  /**
   * 获取列表
   */
  const getList = (params?: any) => {
    if (useMock) {
      return createMockPromise(() => mockFns.getList(params), '获取列表成功')
    }
    return request.get({
      url: `${baseUrl}/list`,
      params
    })
  }

  /**
   * 添加数据
   */
  const add = (data: Partial<T>) => {
    if (useMock) {
      return createMockPromise(() => mockFns.add(data), '添加成功')
    }
    return request.post({
      url: `${baseUrl}/add`,
      data
    })
  }

  /**
   * 更新数据
   */
  const update = (data: Partial<T>) => {
    if (useMock) {
      return createMockPromise(() => mockFns.update(data), '更新成功')
    }
    return request.put({
      url: `${baseUrl}/update`,
      data
    })
  }

  /**
   * 删除数据
   */
  const deleteItem = (id: any) => {
    if (useMock) {
      return createMockPromise(() => mockFns.delete(id), '删除成功')
    }
    return request.del({
      url: `${baseUrl}/delete/${id}`
    })
  }

  /**
   * 批量删除
   */
  const batchDelete = (ids: any[]) => {
    if (useMock) {
      return createMockPromise(() => mockFns.batchDelete(ids), '批量删除成功')
    }
    return request.post({
      url: `${baseUrl}/batch-delete`,
      data: { ids }
    })
  }

  /**
   * 更新状态
   */
  const updateStatus = (id: any, status: number) => {
    if (useMock) {
      return createMockPromise(() => mockFns.updateStatus(id, status), '状态更新成功')
    }
    return request.put({
      url: `${baseUrl}/update-status`,
      data: { id, status }
    })
  }

  /**
   * 获取详情
   */
  const getDetail = (id: any) => {
    if (useMock) {
      return createMockPromise(() => mockFns.getDetail(id), '获取详情成功')
    }
    return request.get({
      url: `${baseUrl}/detail/${id}`
    })
  }

  return {
    getList,
    add,
    update,
    delete: deleteItem,
    batchDelete,
    updateStatus,
    getDetail
  }
}
