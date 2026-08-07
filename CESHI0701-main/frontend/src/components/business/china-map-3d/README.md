# ChinaMap3D 中国地图3D组件

基于Three.js实现的中国地图3D可视化组件，支持省市县三级下钻、飞线动画、雷达扫描等功能。

## 功能特性

- ✅ 省市县三级地图下钻
- ✅ 面包屑导航
- ✅ 鼠标悬停高亮效果
- ✅ 飞线动画
- ✅ 雷达扫描动画
- ✅ 3D模型加载
- ✅ 调试GUI面板
- ✅ 自定义颜色配置
- ✅ 插槽支持（面包屑、加载状态、提示框）

## 基础用法

```vue
<template>
  <ChinaMap3D />
</template>

<script setup>
import ChinaMap3D from '@/components/business/china-map-3d/index.vue'
</script>
```

## 配置选项

```vue
<template>
  <ChinaMap3D
    :config="{
      initialAdcode: '110000',  // 初始显示北京市
      showGUI: true,            // 显示调试面板
      showBreadcrumb: true,     // 显示面包屑
      showLoading: true,        // 显示加载状态
      colors: {
        mapColor: '#06092a',
        mapHoverColor: '#408ef9',
        mapSideColor1: '#3f9ff3',
        mapSideColor2: '#266bff',
        topLineColor: 0x41c0fb
      }
    }"
    :full-screen="true"
    @region-click="handleRegionClick"
    @breadcrumb-change="handleBreadcrumbChange"
    @loading-change="handleLoadingChange"
  />
</template>

<script setup>
const handleRegionClick = (event) => {
  console.log('点击区域:', event.name, event.adcode)
}

const handleBreadcrumbChange = (breadcrumb) => {
  console.log('面包屑变化:', breadcrumb)
}

const handleLoadingChange = (loading) => {
  console.log('加载状态:', loading)
}
</script>
```

## 自定义插槽

```vue
<template>
  <ChinaMap3D>
    <!-- 自定义面包屑 -->
    <template #breadcrumb="{ breadcrumb, goBack }">
      <div class="custom-breadcrumb">
        <span
          v-for="(item, index) in breadcrumb"
          :key="item.adcode"
          @click="index < breadcrumb.length - 1 && goBack(index)"
        >
          {{ item.name }}
        </span>
      </div>
    </template>

    <!-- 自定义加载状态 -->
    <template #loading>
      <div class="custom-loading">加载中...</div>
    </template>

    <!-- 自定义提示框 -->
    <template #tooltip="{ tooltip }">
      <div class="custom-tooltip">
        <h4>{{ tooltip.name }}</h4>
        <p>行政区划代码: {{ tooltip.adcode }}</p>
      </div>
    </template>
  </ChinaMap3D>
</template>
```

## 组件方法

通过 ref 可以访问组件暴露的方法：

```vue
<template>
  <ChinaMap3D ref="mapRef" />
  <button @click="backToChina">返回中国</button>
</template>

<script setup>
import { ref } from 'vue'

const mapRef = ref()

const backToChina = () => {
  mapRef.value?.goBack(0)
}
</script>
```

## Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| config | 组件配置 | `ChinaMap3DConfig` | `{}` |
| fullScreen | 是否全屏模式 | `boolean` | `false` |

## Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| region-click | 区域点击事件 | `(event: MapRegionClickEvent)` |
| breadcrumb-change | 面包屑变化事件 | `(breadcrumb: BreadcrumbItem[])` |
| loading-change | 加载状态变化事件 | `(loading: boolean)` |

## Slots

| 插槽名 | 说明 | 作用域参数 |
|--------|------|-----------|
| breadcrumb | 自定义面包屑 | `{ breadcrumb, goBack }` |
| loading | 自定义加载状态 | - |
| tooltip | 自定义提示框 | `{ tooltip }` |

## Exposes

| 方法/属性 | 说明 | 类型 |
|-----------|------|------|
| loading | 当前加载状态 | `Ref<boolean>` |
| breadcrumb | 当前面包屑导航 | `Ref<BreadcrumbItem[]>` |
| goBack | 返回到指定层级 | `(index: number) => void` |
| mapContainerRef | 地图容器DOM引用 | `Ref<HTMLElement \| null>` |
