/**
 * 中国地图3D组件配置项
 */
export interface ChinaMap3DConfig {
  /** 初始行政区划代码，默认 '100000'（中国） */
  initialAdcode?: string
  /** 是否显示调试GUI，默认 false */
  showGUI?: boolean
  /** 是否显示面包屑导航，默认 true */
  showBreadcrumb?: boolean
  /** 是否显示加载状态，默认 true */
  showLoading?: boolean
  /** 地图颜色配置 */
  colors?: {
    mapColor?: string
    mapHoverColor?: string
    mapSideColor1?: string
    mapSideColor2?: string
    topLineColor?: number
  }
}

/**
 * 地图区域点击事件数据
 */
export interface MapRegionClickEvent {
  /** 区域名称 */
  name: string
  /** 行政区划代码 */
  adcode: string
  /** 区域中心坐标 [经度, 纬度] */
  center: [number, number]
}

/**
 * 面包屑导航项
 */
export interface BreadcrumbItem {
  /** 区域名称 */
  name: string
  /** 行政区划代码 */
  adcode: string
}
