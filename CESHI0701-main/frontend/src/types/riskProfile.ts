/**
 * 风险等级枚举
 */
export enum RiskLevel {
  LOW = 1, // 低风险
  NORMAL = 2, // 一般风险
  HIGH = 3, // 较大风险
  CRITICAL = 4 // 重大风险
}

/**
 * 风险总览统计
 */
export interface RiskOverview {
  /** 低风险库站数 */
  lowCount: number
  /** 一般风险库站数 */
  normalCount: number
  /** 较大风险库站数 */
  highCount: number
  /** 重大风险库站数 */
  criticalCount: number
}

/**
 * 排名粒度
 */
export enum RankGranularity {
  COMPANY = 'company', // 按分公司
  AREA = 'area', // 按片区
  STATION = 'station' // 按库站
}

/**
 * 风险排名项
 */
export interface RiskRankItem {
  /** ID */
  id: number
  /** 名称 */
  name: string
  /** 风险值 */
  riskValue: number
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 排名 */
  rank: number
}

/**
 * 城市风险标记点
 */
export interface CityRiskMarker {
  /** 城市名称 */
  name: string
  /** 行政区划代码 */
  adcode: string
  /** 风险值 */
  riskValue: number
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 库站总数 */
  stationCount: number
}

/**
 * 片区风险标记点（第二层钻取）
 */
export interface AreaRiskMarker {
  /** 片区ID */
  id: number
  /** 片区名称 */
  name: string
  /** 所属地市 adcode */
  cityAdcode: string
  /** 中心经度 */
  longitude: number
  /** 中心纬度 */
  latitude: number
  /** 风险值 */
  riskValue: number
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 库站数 */
  stationCount: number
}

/**
 * 库站风险标记点（第三层钻取）
 */
export interface StationRiskMarker {
  /** 库站ID */
  id: number
  /** 库站名称 */
  name: string
  /** 所属片区ID */
  areaId: number
  /** 所属地市 adcode */
  cityAdcode: string
  /** 经度 */
  longitude: number
  /** 纬度 */
  latitude: number
  /** 风险值 */
  riskValue: number
  /** 风险等级 */
  riskLevel: RiskLevel
}
