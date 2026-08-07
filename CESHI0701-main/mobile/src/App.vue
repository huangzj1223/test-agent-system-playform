<!--
  组件名称：App - 根组件

  功能描述：
    应用的根组件，负责路由渲染和全局布局管理
    集成了页面过渡动画和 KeepAlive 缓存优化
    根据路由配置自动决定是否显示底部导航栏

  核心功能：
    - 路由视图渲染
    - 页面过渡动画（淡入淡出效果）
    - KeepAlive 页面缓存
    - 条件布局（MainLayout）
-->

<template>
  <div id="app">
    <!-- 路由视图容器 -->
    <router-view v-slot="{ Component, route }">
      <!-- 根据路由配置决定是否使用 MainLayout（带底部导航栏） -->
      <MainLayout v-if="route.meta.showTabbar">
        <!-- 需要缓存的页面 -->
        <transition name="fade" mode="out-in">
          <keep-alive>
            <component :is="Component" v-if="route.meta.keepAlive" :key="route.path" />
          </keep-alive>
        </transition>
        <!-- 不需要缓存的页面 -->
        <transition name="fade" mode="out-in">
          <component :is="Component" v-if="!route.meta.keepAlive" :key="route.path" />
        </transition>
      </MainLayout>

      <!-- 不需要底部导航栏的页面 -->
      <template v-else>
        <!-- 需要缓存的页面 -->
        <transition name="fade" mode="out-in">
          <keep-alive>
            <component :is="Component" v-if="route.meta.keepAlive" :key="route.path" />
          </keep-alive>
        </transition>
        <!-- 不需要缓存的页面 -->
        <transition name="fade" mode="out-in">
          <component :is="Component" v-if="!route.meta.keepAlive" :key="route.path" />
        </transition>
      </template>
    </router-view>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import MainLayout from '@/components/Layout/MainLayout.vue'

/**
 * 应用初始化
 * 在组件挂载后执行，输出启动日志
 */
onMounted(() => {
  console.log('H5产品经理原型AI框架已启动')
})
</script>

<style>
/* 应用根容器样式 */
#app {
  width: 100%;
  min-height: 100vh; /* 最小高度占满视口 */
  background-color: var(--bg-page); /* 页面背景色 */
}
</style>
