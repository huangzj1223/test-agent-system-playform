import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { mapConfig } from './mapConfig'

export async function loadConeModels(label2dData: any[]) {
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')
  loader.setDRACOLoader(dracoLoader)

  return new Promise<{
    modelObject3D: THREE.Object3D
    modelMixers: THREE.AnimationMixer[]
  }>((resolve, reject) => {
    loader.load(
      '/models/cone.glb',
      (glb) => {
        const modelObject3D = new THREE.Object3D()
        const modelMixers: THREE.AnimationMixer[] = []

        label2dData.forEach((item: any) => {
          const clonedModel = glb.scene.clone()
          const mixer = new THREE.AnimationMixer(clonedModel)

          const clonedAnimations = glb.animations.map((clip) => clip.clone())
          clonedAnimations.forEach((clip) => {
            mixer.clipAction(clip).play()
          })

          modelMixers.push(mixer)
          clonedModel.position.set(
            item.featureCenterCoord[0],
            -item.featureCenterCoord[1],
            mapConfig.spotZIndex
          )
          clonedModel.scale.set(0.3, 0.3, 0.6)
          modelObject3D.add(clonedModel)
        })

        resolve({ modelObject3D, modelMixers })
      },
      undefined,
      reject
    )
  })
}
