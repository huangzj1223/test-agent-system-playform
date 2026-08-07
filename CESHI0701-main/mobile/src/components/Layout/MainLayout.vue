<!--
  组件名称：MainLayout - 主布局组件

  功能描述：
    应用的主布局组件，包含可滚动的内容区域和固定在底部的导航栏
    内容区域高度自动计算（100vh - 底部导航栏高度）

  使用方式：
    <MainLayout>
      <YourPageContent />
    </MainLayout>

  布局结构：
    - 顶部：可滚动内容区域（通过 slot 插入页面内容）
    - 底部：固定导航栏（Tabbar 组件）
-->

<template>
  <div class="main-layout">
    <!-- 可滚动内容区域 -->
    <div class="main-layout__content">
      <slot />
    </div>
    <!-- 底部导航栏 -->
    <Tabbar />
  </div>
</template>

<script setup>
// 导入底部导航栏组件
import Tabbar from './Tabbar.vue'
</script>

<style scoped>
/* 主布局容器 */
.main-layout {
  width: 100%;
  height: 100vh; /* 占满整个视口高度 */
  display: flex;
  flex-direction: column; /* 垂直布局 */
  background-color: var(--bg-page); /* 页面背景色 */
}

/* 内容区域 */
.main-layout__content {
  flex: 1; /* 占据剩余空间 */
  height: calc(100vh - 50px); /* 高度 = 视口高度 - 底部导航栏高度(50px) */
  overflow-y: auto; /* 垂直方向可滚动 */
  overflow-x: hidden; /* 水平方向隐藏滚动条 */
  -webkit-overflow-scrolling: touch; /* iOS 平滑滚动 */
}
</style>
