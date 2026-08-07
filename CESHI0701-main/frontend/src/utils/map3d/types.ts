import * as THREE from 'three'

export interface ExtendObject3D extends THREE.Object3D {
  customProperties?: any
}

export interface Label2dDataItem {
  featureCenterCoord: [number, number]
  featureName: string
}
