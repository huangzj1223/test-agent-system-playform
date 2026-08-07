import * as THREE from 'three'
import { mapConfig } from './config'

// 创建飞行的球体
function drawFlySpot(curve: THREE.QuadraticBezierCurve3) {
  const geometry = new THREE.SphereGeometry(0.4, 32, 32)
  const material = new THREE.MeshBasicMaterial({
    color: '#FF6A00',
    side: THREE.DoubleSide
  })
  const mesh: any = new THREE.Mesh(geometry, material)
  mesh.curve = curve
  mesh._s = 0
  return mesh
}

// 绘制两点之间的飞线
export function drawLineBetween2Spot(coordStart: [number, number], coordEnd: [number, number]) {
  const [x0, y0, z0] = [...coordStart, mapConfig.spotZIndex]
  const [x1, y1, z1] = [...coordEnd, mapConfig.spotZIndex]

  // 创建贝塞尔曲线
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x0, -y0, z0),
    new THREE.Vector3((x0 + x1) / 2, -(y0 + y1) / 2, 20), // 中间点抬高
    new THREE.Vector3(x1, -y1, z1)
  )

  // 创建飞行的球体
  const flySpot = drawFlySpot(curve)

  // 创建渐变色飞线
  const lineGeometry = new THREE.BufferGeometry()
  const points = curve.getPoints(50)
  const positions: number[] = []
  const colors: number[] = []
  const color = new THREE.Color()

  for (let j = 0; j < points.length; j++) {
    color.setHSL(0.21 + j, 0.77, 0.55 + j * 0.0025)
    colors.push(color.r, color.g, color.b)
    positions.push(points[j].x, points[j].y, points[j].z)
  }

  lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide
  })

  const flyLine = new THREE.Line(lineGeometry, material)

  return { flyLine, flySpot }
}

// 生成随机飞线
export function generateFlyLines(label2dData: any[], maxCount: number = 5) {
  const flyLines: THREE.Line[] = []
  const flySpots: any[] = []

  for (let i = 0; i < maxCount; i++) {
    const randomIndexStart = Math.floor(Math.random() * label2dData.length)
    const randomIndexEnd = Math.floor(Math.random() * label2dData.length)

    if (randomIndexStart !== randomIndexEnd) {
      const { flyLine, flySpot } = drawLineBetween2Spot(
        label2dData[randomIndexStart].featureCenterCoord,
        label2dData[randomIndexEnd].featureCenterCoord
      )
      flyLines.push(flyLine)
      flySpots.push(flySpot)
    }
  }

  return { flyLines, flySpots }
}
