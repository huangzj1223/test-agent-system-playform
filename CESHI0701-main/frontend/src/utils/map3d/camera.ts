import * as THREE from 'three'

export function initCamera(currentDom: HTMLElement) {
  const camera = new THREE.PerspectiveCamera(
    30,
    currentDom.clientWidth / currentDom.clientHeight,
    0.1,
    1000
  )
  camera.position.set(-10, -90, 130)

  const cameraHelper = new THREE.CameraHelper(camera)

  return { camera, cameraHelper }
}
