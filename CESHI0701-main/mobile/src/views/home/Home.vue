<!--
  页面名称：Home - 首页

  功能描述：
    应用的首页，展示框架信息和版本号
    包含欢迎卡片、版本信息列表和操作按钮

  路由信息：
    路径：/home
    名称：Home
    是否缓存：是（KeepAlive）
-->

<template>
  <div class="home-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="首页" fixed placeholder />

    <div class="content">
      <!-- 欢迎卡片 -->
      <div class="welcome-card">
        <h2>欢迎使用</h2>
        <p>H5产品经理原型AI框架</p>
      </div>

      <!-- 版本信息区域 -->
      <div class="info-section">
        <van-cell-group inset>
          <van-cell title="框架版本" value="v1.0.0" />
          <van-cell title="Vue 版本" value="3.4.0" />
          <van-cell title="Vite 版本" value="5.0.0" />
          <van-cell title="Vant 版本" value="4.9.22" />
        </van-cell-group>
      </div>

      <!-- 操作按钮区域 -->
      <div class="action-section">
        <van-button type="primary" block round @click="handleClick"> 开始使用 </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { showToast } from 'vant'

/**
 * 处理点击事件
 * 点击"开始使用"按钮时显示欢迎提示
 */
const handleClick = () => {
  showToast('欢迎使用H5框架！')
}
</script>

<style scoped>
/* 页面容器 */
.home-page {
  min-height: 100vh;
  background-color: var(--bg-page);
}

/* 内容区域 */
.content {
  padding: var(--spacing-md);
}

/* 欢迎卡片 */
.welcome-card {
  background: linear-gradient(135deg, var(--primary-color) 0%, #0d5ac7 100%);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  color: white;
  margin-bottom: var(--spacing-lg);
}

.welcome-card h2 {
  font-size: 24px;
  margin-bottom: var(--spacing-sm);
}

.welcome-card p {
  font-size: 14px;
  opacity: 0.9;
}

/* 信息区域 */
.info-section {
  margin-bottom: var(--spacing-lg);
}

/* 操作区域 */
.action-section {
  padding: 0 var(--spacing-md);
}
</style>
