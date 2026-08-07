/**
 * 风险规则设置相关类型定义
 */

/** 业态风险赋值项 */
export interface BusinessTypeRisk {
  id: number
  /** 业态名称 */
  name: string
  /** 业态编码 */
  code: string
  /** 风险值 */
  riskValue: number
  /** 更新时间 */
  updateTime: string
}

/** 销量风险赋值项 */
export interface SalesVolumeRisk {
  id: number
  /** 商品名称 */
  name: string
  /** 商品编码 */
  code: string
  /** 单位 */
  unit: string
  /** 低档上限（不含） */
  lowMax: number
  /** 低档风险值 */
  lowRisk: number
  /** 中档上限（不含） */
  midMax: number
  /** 中档风险值 */
  midRisk: number
  /** 高档风险值 */
  highRisk: number
  /** 更新时间 */
  updateTime: string
}

/** 严重程度基础分值 */
export interface SeverityScore {
  id: number
  /** 严重程度名称 */
  name: string
  /** 严重程度编码 */
  code: string
  /** 基础分值 */
  score: number
  /** 判定标准描述 */
  description: string
  /** 更新时间 */
  updateTime: string
}

/** 频次赋值规则 */
export interface FrequencyRule {
  id: number
  /** 情况描述 */
  name: string
  /** 编码 */
  code: string
  /** 判定周期（月） */
  cycleMon: number
  /** 触发重复的次数阈值（如2表示周期内≥2次算重复） */
  triggerCount: number
  /** 首次重复加分 */
  firstScore: number
  /** 每次重复增加分 */
  repeatScore: number
  /** 更新时间 */
  updateTime: string
}

/** 整改修正系数 */
export interface RectifyCoefficient {
  id: number
  /** 整改状态名称 */
  name: string
  /** 编码 */
  code: string
  /** 修正系数 */
  coefficient: number
  /** 更新时间 */
  updateTime: string
}

/** 指标权重 */
export interface IndexWeight {
  id: number
  /** 指标名称 */
  name: string
  /** 编码 */
  code: string
  /** 权重（百分比，如60表示60%） */
  weight: number
  /** 更新时间 */
  updateTime: string
}
