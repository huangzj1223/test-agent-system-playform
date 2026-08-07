/**
 * 库站管理类型定义
 */

/** 业态选项 */
export const BUSINESS_TYPES = [
  { id: 1, name: '汽油' },
  { id: 2, name: '柴油' },
  { id: 3, name: '天然气' },
  { id: 4, name: '氢气' },
  { id: 5, name: '充电' },
  { id: 6, name: '光伏' },
  { id: 7, name: '洗车' },
  { id: 8, name: '维保小店' },
  { id: 9, name: '钣金' },
  { id: 10, name: '烤漆' },
  { id: 11, name: '餐饮' },
  { id: 12, name: '洗衣' }
]

/** 库站详情 */
export interface StationDetail {
  id: number
  name: string
  code: string
  /** '加能站' | '油库' */
  type: string
  address: string
  longitude: number
  latitude: number
  managerName: string
  managerPhone: string
  imageUrl: string
  status: number
  /** 已开展业态 ID 列表 */
  businessTypes: number[]
}

/** 月度销量记录 */
export interface MonthlySales {
  id: number
  stationId: number
  /** 格式 YYYY-MM */
  dataMonth: string
  /** 油品销量（吨） */
  oilSales: number
  /** 天然气销量（吨） */
  gasSales: number
  /** 充电量（万度） */
  electricSales: number
  createUser: string
  createTime: string
  updateTime: string
}

/** 库站员工 */
export interface StationEmployee {
  id: number
  username: string
  nickname: string
  phone: string
  email: string
  role: string
}

/** 月度销量查询参数 */
export interface MonthlySalesQueryParams {
  stationId: number
  year?: number | string
  page: number
  pageSize: number
}

/** 基础信息编辑参数 */
export interface StationBasicInfoUpdate {
  id: number
  code?: string
  name?: string
  address?: string
  longitude?: number
  latitude?: number
  managerName?: string
  managerPhone?: string
  imageUrl?: string
}
