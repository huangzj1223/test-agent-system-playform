<!--
  页面名称：Profile - 我的

  功能描述：
    个人中心页面，展示用户信息和设置入口
    包含用户头像、个人信息、账号设置、帮助中心等功能模块

  路由信息：
    路径：/profile
    名称：Profile
    是否缓存：是（KeepAlive）
-->

<template>
  <div class="profile-page">
    <div class="content">
      <!-- 顶部工作天数提示 -->
      <div class="work-days-tip">您已经在这里工作{{ workDays }}天啦！</div>

      <!-- 用户信息卡片 -->
      <div class="user-card">
        <div class="user-avatar">
          <div class="avatar-circle">{{ userInitial }}</div>
        </div>
        <div class="user-info">
          <div class="user-header">
            <div class="user-name-row">
              <h3>{{ userStore.userName || '张宇' }}</h3>
              <span class="user-role">车间主管</span>
            </div>
            <button class="edit-btn" @click="handleEdit">
              <van-icon name="edit" />
              编辑资料
            </button>
          </div>
          <p class="user-id">工号：{{ userStore.userId || '8943994' }}</p>
          <p class="user-dept">{{ userDepartment }}</p>
        </div>
      </div>

      <!-- 功能列表 -->
      <div class="menu-section">
        <van-cell-group inset>
          <van-cell title="字体设置" is-link @click="handleFontSetting">
            <template #icon>
              <van-icon name="font-o" color="#0085FF" size="20" />
            </template>
          </van-cell>
          <van-cell title="服务条款" is-link @click="handleServiceTerms">
            <template #icon>
              <van-icon name="description" color="#0085FF" size="20" />
            </template>
          </van-cell>
          <van-cell title="隐私协议" is-link @click="handlePrivacy">
            <template #icon>
              <van-icon name="shield-o" color="#52C41A" size="20" />
            </template>
          </van-cell>
          <van-cell title="软件版本" is-link>
            <template #icon>
              <van-icon name="upgrade" color="#FF8C00" size="20" />
            </template>
            <template #value>
              <span class="version-text">{{ appVersion }}</span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 退出登录按钮 -->
      <div class="logout-section">
        <van-button block class="logout-btn" @click="handleLogout"> 退出登录 </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useUserStore } from '@/stores/userStore'

/**
 * 我的页面
 * 提供用户信息展示和个人设置功能
 */

// 路由实例
const router = useRouter()

// 用户状态管理
const userStore = useUserStore()

// 工作天数（模拟数据）
const workDays = ref(516)

// 应用版本号
const appVersion = ref('7.8.15')

// 用户部门信息
const userDepartment = ref('杭州厂区/装备集成车间')

/**
 * 计算用户姓名首字
 */
const userInitial = computed(() => {
  const name = userStore.userName || '张宇'
  return name.charAt(0)
})

/**
 * 编辑资料
 */
const handleEdit = () => {
  showToast('功能开发中')
}

/**
 * 字体设置
 */
const handleFontSetting = () => {
  showToast('功能开发中')
}

/**
 * 服务条款
 */
const handleServiceTerms = () => {
  showToast('功能开发中')
}

/**
 * 隐私协议
 */
const handlePrivacy = () => {
  showToast('功能开发中')
}

/**
 * 处理退出登录
 */
const handleLogout = async () => {
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '确定要退出登录吗？'
    })

    // 执行登出操作
    userStore.logout()

    // 提示用户
    showToast('已退出登录')

    // 跳转到登录页
    router.replace('/login')
  } catch {
    // 用户取消操作
  }
}
</script>

<style scoped>
/* 页面容器 */
.profile-page {
  min-height: 100%;
  background-color: var(--bg-page);
}

/* 内容区域 */
.content {
  padding: var(--spacing-md);
}

/* 顶部工作天数提示 */
.work-days-tip {
  background: linear-gradient(135deg, #e6f4ff 0%, #d4ebff 100%);
  border-radius: 0.213rem; /* 8px */
  padding: 0.32rem 0.427rem; /* 12px 16px */
  margin-bottom: var(--spacing-md);
  font-size: 0.373rem; /* 14px */
  color: #1890ff;
  text-align: center;
}

/* 用户信息卡片 */
.user-card {
  background: white;
  border-radius: 0.427rem; /* 16px */
  padding: var(--spacing-lg);
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

/* 用户头像 */
.user-avatar {
  flex-shrink: 0;
}

.avatar-circle {
  width: 1.6rem; /* 60px */
  height: 1.6rem; /* 60px */
  border-radius: 50%;
  background: linear-gradient(135deg, #0085ff 0%, #00c6ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.64rem; /* 24px */
  font-weight: bold;
  color: white;
}

/* 用户信息 */
.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.107rem; /* 4px */
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.213rem; /* 8px */
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 0.213rem; /* 8px */
}

.user-info h3 {
  font-size: 0.48rem; /* 18px */
  font-weight: bold;
  color: var(--text-primary);
  margin: 0;
}

.user-role {
  display: inline-block;
  padding: 0.053rem 0.213rem; /* 2px 8px */
  border: 1px solid #0085ff;
  border-radius: 0.107rem; /* 4px */
  font-size: 0.32rem; /* 12px */
  color: #0085ff;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 0.107rem; /* 4px */
  background: transparent;
  border: none;
  font-size: 0.373rem; /* 14px */
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
}

.edit-btn:active {
  opacity: 0.7;
}

.user-id,
.user-dept {
  font-size: 0.373rem; /* 14px */
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* 菜单区域 */
.menu-section {
  margin-bottom: var(--spacing-md);
}

.menu-section :deep(.van-cell) {
  padding: 0.427rem 0.427rem; /* 16px */
}

.menu-section :deep(.van-cell__left-icon) {
  margin-right: 0.32rem; /* 12px */
}

.version-text {
  color: var(--text-secondary);
  font-size: 0.373rem; /* 14px */
}

/* 退出登录区域 */
.logout-section {
  margin-top: var(--spacing-xl);
}

.logout-btn {
  background: white;
  color: #ff4d4f;
  border: none;
  border-radius: 0.213rem; /* 8px */
  font-size: 0.427rem; /* 16px */
  height: 1.173rem; /* 44px */
}

.logout-btn:active {
  opacity: 0.8;
}
</style>
