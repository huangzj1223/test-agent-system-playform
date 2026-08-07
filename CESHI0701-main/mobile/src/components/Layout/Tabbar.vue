<!--
  组件名称：Tabbar - 底部导航栏组件

  功能描述：
    应用底部的固定导航栏，包含四个导航项：首页、工作台、消息、我的
    自动根据当前路由高亮对应的导航项

  使用方式：
    <Tabbar />

  导航项：
    - 首页 (home): /home
    - 工作台 (workspace): /workspace
    - 消息 (message): /message
    - 我的 (profile): /profile
-->

<template>
  <van-tabbar v-model="active" :fixed="true" :placeholder="true" :safe-area-inset-bottom="true">
    <!-- 首页导航项 -->
    <van-tabbar-item name="home" to="/home">
      <span>首页</span>
      <template #icon="props">
        <TabbarIcon name="home" :active="props.active" />
      </template>
    </van-tabbar-item>

    <!-- 工作台导航项 -->
    <van-tabbar-item name="workspace" to="/workspace">
      <span>工作台</span>
      <template #icon="props">
        <TabbarIcon name="workspace" :active="props.active" />
      </template>
    </van-tabbar-item>

    <!-- 消息导航项 -->
    <van-tabbar-item name="message" to="/message">
      <span>消息</span>
      <template #icon="props">
        <TabbarIcon name="message" :active="props.active" />
      </template>
    </van-tabbar-item>

    <!-- 我的导航项 -->
    <van-tabbar-item name="profile" to="/profile">
      <span>我的</span>
      <template #icon="props">
        <TabbarIcon name="profile" :active="props.active" />
      </template>
    </van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TabbarIcon from '@/components/Common/TabbarIcon.vue'

// 获取当前路由信息
const route = useRoute()

/**
 * 当前激活的标签
 * @type {import('vue').Ref<string>}
 */
const active = ref('home')

/**
 * 监听路由变化，更新激活的标签
 * 根据当前路由路径自动切换底部导航栏的激活状态
 */
watch(
  () => route.path,
  (newPath) => {
    // 判断当前路由并设置对应的激活标签
    if (newPath.startsWith('/home')) {
      active.value = 'home'
    } else if (newPath.startsWith('/workspace')) {
      active.value = 'workspace'
    } else if (newPath.startsWith('/message')) {
      active.value = 'message'
    } else if (newPath.startsWith('/profile')) {
      active.value = 'profile'
    }
  },
  { immediate: true } // 立即执行一次，确保初始状态正确
)
</script>

<style scoped>
/* 自定义样式可以在这里添加 */
</style>
