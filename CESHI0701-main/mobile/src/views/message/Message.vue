<!--
  页面名称：Message - 消息页面

  功能描述：
    显示系统消息和通知列表

  路由信息：
    路径：/message
    名称：Message
-->

<template>
  <div class="message-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="消息" fixed placeholder />

    <!-- 内容区域 -->
    <div class="content">
      <van-empty description="暂无消息" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

/**
 * 页面初始化
 */
onMounted(() => {
  console.log('消息页面已加载')
})
</script>

<style scoped>
.message-page {
  min-height: 100vh;
  background-color: var(--bg-page);
}

.content {
  padding: var(--spacing-md);
}
</style>
