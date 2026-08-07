<!--
  页面名称：Workspace - 工作台

  功能描述：
    工作台页面，展示组件示例入口
    包含图表组件、表单组件、详情组件、列表组件等

  路由信息：
    路径：/workspace
    名称：Workspace
    是否缓存：是（KeepAlive）
-->

<template>
  <div class="workspace-page">
    <div class="content">
      <!-- 工作台卡片 -->
      <div class="workspace-card">
        <h2>工作台</h2>
        <p>这里是工作台页面</p>
      </div>

      <!-- 图表组件区域 -->
      <div class="workspace-section">
        <div class="section-title">图表组件</div>
        <van-cell-group inset>
          <van-cell title="图表组件" is-link @click="handleGoToCharts" />
        </van-cell-group>
      </div>

      <!-- 表单组件区域 -->
      <div class="workspace-section">
        <div class="section-title">表单组件</div>
        <van-cell-group inset>
          <van-cell title="基础表单" is-link @click="handleGoToForm('basic')" />
          <van-cell title="复杂表单" is-link @click="handleGoToForm('complex')" />
          <van-cell title="登记表单" is-link @click="handleGoToForm('register')" />
        </van-cell-group>
      </div>

      <!-- 详情组件区域 -->
      <div class="workspace-section">
        <div class="section-title">详情组件</div>
        <van-cell-group inset>
          <van-cell title="用户详情" is-link @click="handleGoToDetail('user')" />
          <van-cell title="订单详情" is-link @click="handleGoToDetail('order')" />
          <van-cell title="项目详情" is-link @click="handleGoToDetail('project')" />
          <van-cell title="产品详情" is-link @click="handleGoToDetail('product')" />
        </van-cell-group>
      </div>

      <!-- 列表组件区域 -->
      <div class="workspace-section">
        <div class="section-title">列表组件</div>
        <van-cell-group inset>
          <van-cell title="基础列表" is-link @click="handleGoToList('basic')" />
          <van-cell title="搜索筛选列表" is-link @click="handleGoToList('search')" />
          <van-cell title="滚动加载列表" is-link @click="handleGoToList('scroll')" />
          <van-cell title="卡片列表" is-link @click="handleGoToList('card')" />
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

/**
 * 工作台页面
 * 提供组件示例入口和管理界面
 */

// 路由实例
const router = useRouter()

/**
 * 跳转到图表组件示例页面
 */
const handleGoToCharts = () => {
  router.push('/charts/demo')
}

/**
 * 跳转到表单组件页面
 * @param {string} type - 表单类型（basic/complex/register）
 */
const handleGoToForm = (type) => {
  router.push(`/components/form?type=${type}`)
}

/**
 * 跳转到详情组件页面
 * @param {string} type - 详情类型（user/order/project/product）
 */
const handleGoToDetail = (type) => {
  router.push(`/components/detail?type=${type}`)
}

/**
 * 跳转到列表组件页面
 * @param {string} type - 列表类型（basic/search/scroll/card）
 */
const handleGoToList = (type) => {
  router.push(`/components/list?type=${type}`)
}
</script>

<style scoped>
/* 页面容器 */
.workspace-page {
  min-height: 100%;
  background-color: var(--bg-page);
}

/* 内容区域 */
.content {
  padding: var(--spacing-md);
}

/* 工作台卡片 */
.workspace-card {
  background: linear-gradient(135deg, var(--primary-color) 0%, #0d5ac7 100%);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  text-align: center;
  color: white;
  margin-bottom: var(--spacing-lg);
}

.workspace-card h2 {
  font-size: 24px;
  margin-bottom: var(--spacing-sm);
}

.workspace-card p {
  font-size: 14px;
  opacity: 0.9;
}

/* 功能列表区域 */
.workspace-section {
  margin-bottom: var(--spacing-lg);
}

/* 区域标题 */
.section-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  padding-left: var(--spacing-sm);
}
</style>
