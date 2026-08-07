<!--
  页面名称：Login - 登录页面

  功能描述：
    用户登录页面，支持内部用户和外部用户两种登录方式
    内部用户：统一身份账号 + 密码
    外部用户：手机号 + 密码

  路由信息：
    路径：/login
    名称：Login
    是否缓存：否
-->

<template>
  <div class="login-page">
    <!-- 顶部装饰 -->
    <div class="login-header">
      <div class="logo">
        <img src="@/assets/images/logo.png" alt="Logo" class="logo-image" />
        <div class="logo-text">
          <h1 class="system-name">作业安全管控平台</h1>
          <p class="system-desc">新一代数字化安全管控中枢</p>
        </div>
      </div>
    </div>

    <!-- 登录表单 -->
    <div class="login-form">
      <!-- Tab 切换 -->
      <van-tabs v-model:active="activeTab" class="login-type" @change="onTabChange">
        <van-tab title="内部用户" name="internal"></van-tab>
        <van-tab title="外部用户" name="external"></van-tab>
      </van-tabs>

      <van-form class="login-card" @submit="onSubmit">
        <!-- 内部用户：统一身份账号 -->
        <van-field
          v-if="activeTab === 'internal'"
          v-model="formData.accountId"
          name="accountId"
          label="统一身份账号"
          label-align="top"
          input-align="left"
          class="custom-field"
          placeholder="请输入统一身份账号"
          :rules="[{ required: true, message: '请输入统一身份账号' }]"
        />

        <!-- 外部用户：手机号 -->
        <van-field
          v-if="activeTab === 'external'"
          v-model="formData.phone"
          name="phone"
          type="tel"
          label="手机号"
          label-align="top"
          input-align="left"
          class="custom-field"
          placeholder="请输入手机号"
          :rules="[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
          ]"
        />

        <!-- 密码输入框（共用） -->
        <van-field
          v-model="formData.password"
          type="password"
          name="password"
          label="密码"
          label-align="top"
          input-align="left"
          class="custom-field"
          placeholder="请输入"
          :rules="[{ required: true, message: '请输入密码' }]"
        />

        <!-- 记住用户 + 忘记密码 -->
        <div class="remember-forgot-box">
          <van-checkbox v-model="formData.rememberMe" shape="square"> 记住用户 </van-checkbox>
          <span class="link-text" @click="goToForgotPassword">忘记密码</span>
        </div>

        <!-- 登录按钮 -->
        <div class="login-button">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            登录
          </van-button>
        </div>
      </van-form>

      <!-- 底部协议文字 -->
      <div class="bottom-agreement">
        登录即同意
        <span class="link-text" @click="showAgreement">《用户服务协议》</span>和
        <span class="link-text" @click="showPrivacy">《隐私政策》</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/userStore'

// 路由实例
const router = useRouter()

// 用户状态管理
const userStore = useUserStore()

// 当前选中的 Tab（默认内部用户）
const activeTab = ref('internal')

// 表单数据
const formData = reactive({
  accountId: '', // 内部用户：统一身份账号
  phone: '', // 外部用户：手机号
  password: '', // 密码（共用）
  rememberMe: false // 记住用户
})

// 加载状态
const loading = ref(false)

/**
 * Tab 切换事件
 * @param {string} name - Tab 名称
 */
const onTabChange = (name) => {
  // 切换 Tab 时清空表单
  formData.accountId = ''
  formData.phone = ''
  formData.password = ''
}

/**
 * 处理表单提交
 * @param {Object} values - 表单数据
 */
const onSubmit = async (values) => {
  loading.value = true

  try {
    let res
    if (activeTab.value === 'internal') {
      // 内部用户登录
      res = await userStore.login(formData.accountId, formData.password)
    } else {
      // 外部用户登录
      res = await userStore.login(formData.phone, formData.password)
    }

    if (res.code === 200) {
      showToast('登录成功')
      router.replace('/home')
    }
  } catch (error) {
    showToast('登录失败，请重试')
  } finally {
    loading.value = false
  }
}

/**
 * 显示用户服务协议
 */
const showAgreement = () => {
  showToast('功能开发中')
}

/**
 * 显示隐私政策
 */
const showPrivacy = () => {
  showToast('功能开发中')
}

/**
 * 跳转到忘记密码页面
 */
const goToForgotPassword = () => {
  showToast('功能开发中')
}
</script>

<style scoped>
/* 页面容器 - 使用背景图片，固定高度不滚动 */
.login-page {
  height: 100vh;
  overflow: hidden;
  background-image: url('@/assets/images/login_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
}

/* 顶部区域 */
.login-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 50px var(--spacing-lg) 30px; /* 80px 30px */
}

/* Logo 容器 - 左右布局 */
.logo {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.427rem; /* 16px */
}

/* Logo 图片 */
.logo-image {
  width: 62px; /* 80px */
  height: 62px; /* 80px */
  flex-shrink: 0;
}

/* Logo 文字区域 */
.logo-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

/* 系统名称 */
.system-name {
  font-size: 0.64rem; /* 24px */
  font-weight: bold;
  color: #003a7c;
  margin: 0;
  line-height: 1.2;
}

/* 系统描述 */
.system-desc {
  font-size: 0.373rem; /* 14px */
  color: #1d2129;
  margin: 0.213rem 0 0 0; /* 8px */
  line-height: 1.4;
  letter-spacing: 0.053rem; /* 2px，增加字距 */
}

/* 表单容器 - 占满剩余高度和屏幕宽度，渐变背景 */
.login-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 1) 20%);
  border-radius: 24px 24px 0 0; /* 22px */
  border-top: 1px solid rgba(255, 255, 255, 0.8);
  padding: var(--spacing-lg);
  backdrop-filter: blur(0.267rem); /* 10px */
  overflow: hidden;
  /* 覆盖 Vant 组件的 CSS 变量 */
  --van-cell-background-color: transparent;
  --van-cell-background: transparent;
  --van-cell-border-color: transparent;
}

.login-type {
  margin-bottom: 0.8rem; /* 30px */
}

.login-card {
  padding: 0 16px;
}

/* Tab 样式调整 */
.login-form :deep(.van-tabs__nav) {
  background: transparent;
}

.login-form :deep(.van-tabs__wrap) {
  border-bottom: none;
}

.login-form :deep(.van-tab) {
  font-size: 0.48rem; /* 18px */
  color: var(--text-secondary);
}

.login-form :deep(.van-tab--active) {
  color: #0082ff;
  font-weight: 500;
}

.login-form :deep(.van-tabs__line) {
  background: linear-gradient(-270deg, rgba(0, 133, 255, 1) 0%, rgba(0, 199, 255, 1) 100%);
}

/* 服务协议勾选框 */
/* 记住用户 + 忘记密码区域 */
.remember-forgot-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.373rem; /* 14px */
}

.remember-forgot-box :deep(.van-checkbox__label) {
  font-size: 0.373rem; /* 14px */
  color: #646566;
}

.link-text {
  color: var(--primary-color);
  cursor: pointer;
}

.link-text:active {
  opacity: 0.7;
}

/* 登录按钮 */
.login-button {
  margin-top: var(--spacing-lg);
}

.login-button :deep(.van-button) {
  border-radius: 0.213rem; /* 8px，减小圆角 */
}

.login-button :deep(.van-button--primary) {
  background: linear-gradient(-270deg, rgba(0, 133, 255, 1) 0%, rgba(0, 199, 255, 1) 100%);
  border: none;
  height: 48px;
  font-size: 18px;
}

/* 底部协议文字区域 */
.bottom-agreement {
  text-align: center;
  font-size: 0.32rem; /* 12px */
  color: var(--text-secondary);
  margin-top: auto; /* 推到底部 */
  padding-top: var(--spacing-md);
  padding-bottom: 30px;
}

/* 自定义输入框样式 - label 在上方，输入框有填充色 */
.login-form .custom-field :deep(.van-field) {
  background: transparent !important;
}

.login-form .custom-field :deep(.van-cell) {
  padding: 0;
  background: transparent !important;
  background-color: transparent !important;
  align-items: flex-start;
}

.login-form .custom-field :deep(.van-cell::after) {
  display: none !important;
  border: none !important;
  content: none !important;
}

.custom-field :deep(.van-field__label) {
  font-weight: 500;
  font-size: 0.427rem; /* 16px */
  color: #323233;
  width: 100%;
  margin-bottom: 10px;
}

.custom-field :deep(.van-field__body) {
  width: 100%;
}

.custom-field :deep(.van-field__control) {
  background-color: #f4f9ff;
  padding: 0.32rem; /* 12px */
  border-radius: 0.213rem; /* 8px */
  font-size: 0.427rem; /* 16px */
}

.custom-field :deep(.van-field__control::placeholder) {
  color: #c8c9cc;
}
</style>
