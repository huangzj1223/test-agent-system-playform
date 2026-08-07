<template>
  <div class="china-map-3d" :class="{ 'is-full-screen': fullScreen }">
    <!-- 面包屑导航 -->
    <div v-if="showBreadcrumb && breadcrumb.length > 1" class="breadcrumb-nav">
      <slot name="breadcrumb" :breadcrumb="breadcrumb" :go-back="goBack">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item
            v-for="(item, index) in breadcrumb"
            :key="item.adcode"
            :class="{ 'is-active': index === breadcrumb.length - 1 }"
            @click="index < breadcrumb.length - 1 && goBack(index)"
          >
            {{ item.name }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </slot>
    </div>

    <!-- 地图画布容器 -->
    <div ref="mapContainerRef" class="map-canvas"></div>

    <!-- 加载状态 -->
    <div v-if="showLoading && loading" class="loading-overlay">
      <slot name="loading">
        <el-icon class="is-loading" :size="40">
          <Loading />
        </el-icon>
        <div class="loading-text">加载中...</div>
      </slot>
    </div>

    <!-- 提示框 -->
    <div
      v-if="tooltip.visible"
      class="map-tooltip"
      :style="{ left: tooltip.x + 10 + 'px', top: tooltip.y + 10 + 'px' }"
    >
      <slot name="tooltip" :tooltip="tooltip">
        {{ tooltip.name }}
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  /**
   * 中国地图3D可视化组件
   *
   * 基于Three.js实现的中国地图3D可视化组件，支持：
   * - 省市县三级下钻
   * - 面包屑导航
   * - 鼠标悬停高亮
   * - 飞线动画
   * - 雷达扫描动画
   * - 3D模型加载
   * - 调试GUI面板
   *
   * @example
   * ```vue
   * <ChinaMap3D
   *   :config="{ initialAdcode: '110000', showGUI: true }"
   *   @region-click="handleRegionClick"
   * />
   * ```
   */
  import { ref, watch } from 'vue'
  import { Loading } from '@element-plus/icons-vue'
  // import { useMap3D } from '@/views/china-map/composables/useMap3D'
  import { mapConfig } from '@/utils/map3d/mapConfig'
  import type { ChinaMap3DConfig, MapRegionClickEvent, BreadcrumbItem } from './types'

  defineOptions({
    name: 'ChinaMap3D'
  })

  /**
   * 组件属性
   */
  const props = withDefaults(
    defineProps<{
      /** 组件配置 */
      config?: ChinaMap3DConfig
      /** 是否全屏模式 */
      fullScreen?: boolean
    }>(),
    {
      config: () => ({}),
      fullScreen: false
    }
  )

  /**
   * 组件事件
   */
  const emit = defineEmits<{
    /** 区域点击事件 */
    'region-click': [event: MapRegionClickEvent]
    /** 面包屑导航变化事件 */
    'breadcrumb-change': [breadcrumb: BreadcrumbItem[]]
    /** 加载状态变化事件 */
    'loading-change': [loading: boolean]
  }>()

  // 解构配置项
  const {
    initialAdcode = '100000',
    showGUI = false,
    showBreadcrumb = true,
    showLoading = true,
    colors
  } = props.config

  // 应用颜色配置
  if (colors) {
    if (colors.mapColor) mapConfig.mapColor = colors.mapColor
    if (colors.mapHoverColor) mapConfig.mapHoverColor = colors.mapHoverColor
    if (colors.mapSideColor1) mapConfig.mapSideColor1 = colors.mapSideColor1
    if (colors.mapSideColor2) mapConfig.mapSideColor2 = colors.mapSideColor2
    if (colors.topLineColor !== undefined) mapConfig.topLineColor = colors.topLineColor
  }

  // 地图容器引用
  const mapContainerRef = ref<HTMLElement | null>(null)

  // 临时占位数据（因为 useMap3D 模块缺失）
  const loading = ref(false)
  const tooltip = ref({ visible: false, name: '', x: 0, y: 0 })
  const breadcrumb = ref<BreadcrumbItem[]>([])
  const goBack = (index: number) => {
    console.log('goBack', index)
  }

  // 使用地图3D composable
  // const { loading, tooltip, breadcrumb, goBack } = useMap3D(mapContainerRef)

  // 监听加载状态变化
  watch(loading, (val) => {
    emit('loading-change', val)
  })

  // 监听面包屑变化
  watch(
    breadcrumb,
    (val) => {
      emit('breadcrumb-change', val)
    },
    { deep: true }
  )

  /**
   * 暴露给父组件的方法和属性
   */
  defineExpose({
    /** 当前加载状态 */
    loading,
    /** 当前面包屑导航 */
    breadcrumb,
    /** 返回到指定层级 */
    goBack,
    /** 地图容器DOM引用 */
    mapContainerRef
  })
</script>

<style scoped lang="scss">
  .china-map-3d {
    width: 100%;
    height: 100%;
    position: relative;
    background: #000;

    &.is-full-screen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2500;
    }

    .breadcrumb-nav {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 100;
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 8px;
      backdrop-filter: blur(10px);

      :deep(.el-breadcrumb) {
        .el-breadcrumb__item {
          .el-breadcrumb__inner {
            color: #fff;
            cursor: pointer;
            transition: color 0.3s;

            &:hover {
              color: #409eff;
            }
          }

          &.is-active .el-breadcrumb__inner {
            color: #409eff;
            cursor: default;
          }

          .el-breadcrumb__separator {
            color: rgba(255, 255, 255, 0.6);
          }
        }
      }
    }

    .map-canvas {
      width: 100%;
      height: 100%;
      position: relative;
      background: #000;
    }

    .loading-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: #fff;
      z-index: 10;

      .loading-text {
        font-size: 14px;
      }
    }

    .map-tooltip {
      position: fixed;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      white-space: nowrap;
    }
  }
</style>

<style lang="scss">
  /* dat.GUI 全局样式，确保在全屏模式下也能显示 */
  .dg.ac {
    z-index: 99999 !important;
  }
</style>
