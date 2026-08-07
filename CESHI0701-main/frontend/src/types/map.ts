import type * as THREE from 'three'
import type * as d3 from 'd3'

// 地图层级类型
export type MapLevel = 'country' | 'province' | 'city'

// 地图配置接口
export interface MapConfig {
  depth: number // 地图厚度
  color: string // 地图颜色
  hoverColor: string // 悬停颜色
  lineColor: string // 边界线颜色
  opacity: number // 透明度
}

// 地图数据点接口
export interface MapDataPoint {
  name: string
  value: number
  coordinate: [number, number]
}

// 场景引用接口
export interface MapSceneRefs {
  scene: THREE.Scene | null
  camera: THREE.PerspectiveCamera | null
  renderer: THREE.WebGLRenderer | null
  controls: any | null
  map: THREE.Object3D | null
  projection: d3.GeoProjection | null
}

// 提示框数据接口
export interface TooltipData {
  visible: boolean
  x: number
  y: number
  name: string
  value?: number
}

// GeoJSON 特征接口
export interface GeoFeature {
  type: 'Feature'
  properties: {
    name: string
    adcode: string
    center: [number, number]
    centroid: [number, number]
    childrenNum: number
    level: string
    parent: {
      adcode: string
    }
    subFeatureIndex: number
    acroutes: number[]
  }
  geometry: {
    type: 'MultiPolygon' | 'Polygon'
    coordinates: number[][][] | number[][][][]
  }
}

// GeoJSON 数据接口
export interface GeoJsonData {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

// 地图状态接口
export interface MapState {
  level: MapLevel
  adcode: string
  name: string
  data: GeoJsonData | null
}
