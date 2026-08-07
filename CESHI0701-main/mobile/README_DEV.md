# H5 产品经理原型AI框架 - 开发文档

## 项目简介

这是一个基于 Vue 3 + Vite 开发的产品经理移动端H5-AI框架，使用Ai根据框架快速生成页面和功能。

## 技术栈

- **框架**: Vue 3.4 + Composition API
- **构建工具**: Vite 5.0
- **UI 组件库**: Vant 4.x (蓝色主题)
- **状态管理**: Pinia
- **路由**: Vue Router 4.x
- **HTTP 客户端**: Axios
- **Mock 方案**: Mock.js
- **工具库**: dayjs (日期处理)

## 项目结构

```
H5 目录说明
├── .husky/                  # Git hooks 配置
│   └── pre-commit           # 提交前钩子（ESLint + Prettier）
├── .vscode/                 # VS Code 配置
│   └── settings.json        # 编辑器设置
├── android/                 # Android 原生项目（Capacitor）
├── ios/                     # iOS 原生项目（Capacitor）
├── public/                  # 静态资源
├── src/
│   ├── api/                 # API 接口
│   │   ├── request.js       # Axios 封装（拦截器、统一错误处理）
│   │   └── modules/         # API 模块
│   │       └── authApi.js   # 认证接口（登录、获取用户信息）
│   ├── assets/              # 资源文件
│   │   ├── images/          # 图片资源
│   │   │   ├── login_bg.png # 登录页背景图
│   │   │   └── logo.png     # 应用 Logo
│   │   └── styles/          # 样式文件
│   │       ├── variables.css    # CSS 变量（蓝色主题 #0085FF）
│   │       ├── main.css         # 全局样式
│   │       ├── transition.css   # 过渡动画样式
│   │       └── vant-custom.css  # Vant 组件自定义样式
│   ├── components/          # 组件
│   │   ├── Common/          # 通用组件
│   │   │   └── TabbarIcon.vue  # 底部导航图标（SVG）
│   │   └── Layout/          # 布局组件
│   │       ├── MainLayout.vue  # 主布局（内容区 + 底部导航栏）
│   │       └── Tabbar.vue      # 底部导航栏（四个导航项）
│   ├── mock/                # Mock 数据
│   │   ├── index.js         # Mock 配置入口（200-600ms 延迟）
│   │   └── modules/         # Mock 数据模块
│   │       └── auth.js      # 认证 Mock 数据
│   ├── router/              # 路由配置
│   │   └── index.js         # 路由配置（5个路由 + 守卫 + KeepAlive）
│   ├── stores/              # Pinia 状态管理
│   │   ├── appStore.js      # 应用全局状态（配置、加载状态）
│   │   └── userStore.js     # 用户状态（登录、用户信息、Token）
│   ├── utils/               # 工具函数
│   │   ├── storage.js       # 本地存储工具（Token、用户信息）
│   │   ├── format.js        # 格式化工具（日期、金额、手机号）
│   │   └── flexible.js      # 移动端 rem 适配（375px 设计稿）
│   ├── views/               # 页面（按模块组织）
│   │   ├── login/
│   │   │   └── Login.vue    # 登录页（双模式：内部/外部用户）
│   │   ├── home/
│   │   │   └── Home.vue     # 首页（欢迎页）
│   │   ├── workspace/
│   │   │   └── Workspace.vue   # 工作台
│   │   ├── message/
│   │   │   └── Message.vue  # 消息页（消息列表）
│   │   └── profile/
│   │       └── Profile.vue     # 我的（用户信息、设置、退出登录）
│   ├── App.vue              # 根组件（含过渡动画 + KeepAlive）
│   └── main.js              # 应用入口
├── .env.development         # 开发环境配置
├── .prettierrc              # Prettier 配置
├── .prettierignore          # Prettier 忽略文件
├── capacitor.config.json    # Capacitor 配置（移动端打包）
├── eslint.config.js         # ESLint 配置（Flat Config）
├── index.html               # HTML 入口
├── jsconfig.json            # JavaScript 配置（路径别名等）
├── package.json             # 项目配置
├── package-lock.json        # 依赖锁定文件
├── postcss.config.js        # PostCSS 配置（pxtorem 转换）
├── vite.config.js           # Vite 配置
├── CLAUDE.md                # Claude Code 开发指南
└── README_DEV.md            # 开发文档
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 已实现功能

### 页面列表

#### 1. 登录页 (Login.vue)

**路径**: `/login`
**文件**: `src/views/login/Login.vue`

**功能特性**:

- 双模式登录切换（内部用户/外部用户）
- 内部用户：统一身份账号 + 密码
- 外部用户：手机号 + 密码
- 记住用户功能（Checkbox）
- 忘记密码入口
- 用户服务协议和隐私政策链接
- 渐变背景 + 毛玻璃效果
- 渐变按钮和 Tab 指示器

**技术要点**:

- 使用 Vant Tabs 组件实现模式切换
- 表单验证（手机号正则、必填项）
- 登录成功后跳转首页并保存 Token
- 背景图片 + 渐变叠加效果

#### 2. 首页 (Home.vue)

**路径**: `/home`
**文件**: `src/views/home/Home.vue`

**功能特性**:

- 欢迎卡片展示
- 框架信息说明
- 版本号显示
- 操作按钮入口

**技术要点**:

- 使用 MainLayout 布局（带底部导航）
- KeepAlive 缓存页面状态
- 简洁的卡片式设计

#### 3. 工作台 (Workspace.vue)

**路径**: `/workspace`
**文件**: `src/views/workspace/Workspace.vue`

**功能特性**:

- 工作台主页面
- 预留功能扩展区域

**技术要点**:

- 使用 MainLayout 布局
- KeepAlive 缓存页面状态

#### 4. 消息 (Message.vue)

**路径**: `/message`
**文件**: `src/views/message/Message.vue`

**功能特性**:

- 消息列表页面
- 预留消息通知功能

**技术要点**:

- 使用 MainLayout 布局
- KeepAlive 缓存页面状态
- 使用 Vant Empty 组件显示空状态

#### 5. 我的 (Profile.vue)

**路径**: `/profile`
**文件**: `src/views/profile/Profile.vue`

**功能特性**:

- 工作天数提示（顶部蓝色渐变卡片）
- 用户信息卡片：
  - 圆形头像（蓝色渐变背景 + 姓名首字）
  - 用户姓名 + 角色标签
  - 编辑资料按钮
  - 工号和部门信息
- 功能列表：
  - 字体设置
  - 服务条款
  - 隐私协议
  - 软件版本
- 退出登录按钮（白底红字）

**技术要点**:

- 使用 Vant CellGroup 组件
- 自定义图标颜色
- 退出登录确认对话框
- 清除 Token 和用户信息后跳转登录页

### 组件列表

#### 1. MainLayout.vue

**路径**: `src/components/Layout/MainLayout.vue`

**功能**:

- 主布局容器
- 可滚动内容区域（自动计算高度）
- 固定底部导航栏
- 适配移动端安全区域

#### 2. Tabbar.vue

**路径**: `src/components/Layout/Tabbar.vue`

**功能**:

- 底部导航栏（四个导航项）
- 首页、工作台、消息、我的
- 自定义 SVG 图标
- 路由联动

#### 3. TabbarIcon.vue

**路径**: `src/components/Common/TabbarIcon.vue`

**功能**:

- SVG 图标组件
- 支持激活/未激活状态
- 四种图标：home、workspace、message、profile

### 状态管理

#### 1. appStore.js

**功能**:

- 应用全局配置（标题、版本、主题色）
- 全局加载状态管理
- 配置更新方法

#### 2. userStore.js

**功能**:

- 用户登录状态管理
- Token 存储和读取
- 用户信息管理（id、name、phone、email、avatar）
- 登录/登出方法
- 获取用户信息方法
- localStorage 持久化

### API 接口

#### authApi.js

**路径**: `src/api/modules/authApi.js`

**接口列表**:

- `login(username, password)`: 用户登录
- `getUserInfo()`: 获取用户信息

### Mock 数据

#### auth.js

**路径**: `src/mock/modules/auth.js`

**Mock 接口**:

- `POST /api/login`: 返回 token 和用户信息
- `GET /api/user/info`: 返回用户详细信息

### 工具函数

#### 1. storage.js

**功能**:

- Token 管理：`getToken()`, `setToken()`, `removeToken()`
- 用户信息管理：`getUserInfo()`, `setUserInfo()`, `removeUserInfo()`
- 通用存储：`setStorage()`, `getStorage()`, `removeStorage()`, `clearAll()`

#### 2. format.js

**功能**:

- `formatDate()`: 日期格式化（基于 dayjs）
- `formatMoney()`: 金额格式化
- `formatPhone()`: 手机号脱敏
- `formatFileSize()`: 文件大小格式化

#### 3. flexible.js

**功能**:

- 移动端 rem 适配
- 基于 375px 设计稿
- 动态设置根元素字体大小
- 响应窗口大小变化

### 移动端适配

#### rem 适配方案

**配置文件**:

- `src/utils/flexible.js`: 动态设置 rem 基准值
- `postcss.config.js`: px 自动转换为 rem

**适配规则**:

- 设计稿宽度：375px
- rootValue：37.5（1rem = 37.5px）
- 自动转换范围：1px - 750px
- 保留小数位：5 位

**使用方式**:

- 开发时直接写 px 单位
- 构建时自动转换为 rem
- 例如：`width: 375px` → `width: 10rem`

### Capacitor 移动端打包

**配置文件**: `capacitor.config.json`

**支持平台**:

- Android
- iOS

**配置项**:

- appId: `com.axuremart.ai`
- appName: `作业安全管控平台`
- webDir: `dist`
- bundledWebRuntime: false

**打包命令**:

```bash
# 构建 Web 应用
npm run build

# 同步到原生项目
npx cap sync

# 打开 Android Studio
npx cap open android

# 打开 Xcode
npx cap open ios
```

## Mock 数据说明

所有接口数据都使用 Mock.js 模拟，无需连接真实后端。

## 主题配置

应用使用蓝色作为主色调，配置在 `src/assets/styles/variables.css`：

```css
--primary-color: #1171f8; /* 主色调 */
--success-color: #07c160; /* 成功色 */
--warning-color: #ff976a; /* 警告色 */
--danger-color: #ee0a24; /* 危险色 */
--info-color: #1171f8; /* 信息色 */
```

## 重要说明

- 使用 viewport 进行适配
- 支持 4.7-6.9 英寸屏幕
- 响应式布局
- 所有代码都需要写上中文注释的，每个页面顶部也需要写上页面名称，组件的顶部也需要写上组件名称和使用方式

## 浏览器兼容性

- iOS 12+
- Android 8+
- Chrome 70+
- Safari 12+

## 开发注意事项

1. **Mock 数据**：所有数据都是模拟的，刷新页面后会重新生成
2. **状态持久化**：当前版本未实现状态持久化，刷新页面会丢失状态

---

# 业务功能开发流程规范

## 开发流程

当你开始开发业务功能时，请按照以下标准流程进行：

### 步骤 1：添加新页面

在 `src/views/` 目录下创建新的业务模块页面。

**目录结构：**

```
src/views/your-module/YourPage.vue
```

**示例：**

```vue
<!--
  页面名称：YourPage - 页面功能描述

  功能描述：
    详细说明页面的功能和用途

  路由信息：
    路径：/your-module/your-page
    名称：YourPage
-->
<template>
  <div class="your-page">
    <van-nav-bar title="页面标题" left-arrow @click-left="onClickLeft" />
    <!-- 页面内容 -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// 路由实例
const router = useRouter()

// 返回上一页
const onClickLeft = () => {
  router.back()
}

// 页面初始化
onMounted(() => {
  // 初始化逻辑
})
</script>

<style scoped>
.your-page {
  min-height: 100vh;
  background-color: var(--bg-page);
}
</style>
```

### 步骤 2：添加路由

在 `src/router/index.js` 中配置路由。

**示例：**

```javascript
{
  path: '/your-module/your-page',
  name: 'YourPage',
  component: () => import('@/views/your-module/YourPage.vue'),
  meta: {
    title: '页面标题',
    requiresAuth: true,    // 是否需要登录
    keepAlive: true,       // 是否缓存页面
    showTabbar: false      // 是否显示底部导航
  }
}
```

### 步骤 3：添加 API 接口

在 `src/api/modules/` 目录下创建对应的 API 文件。

**目录结构：**

```
src/api/modules/yourModuleApi.js
```

**示例：**

```javascript
/**
 * 文件名称：yourModuleApi.js - 业务模块 API 接口
 *
 * 功能描述：
 *   提供业务模块相关的 API 接口
 *
 * 使用方式：
 *   import { getYourData } from '@/api/modules/yourModuleApi'
 */

import request from '@/api/request'

/**
 * 获取数据列表
 * @param {Object} params - 查询参数
 * @returns {Promise} 返回数据列表
 */
export const getYourDataList = (params) => {
  return request({
    url: '/your-module/list',
    method: 'get',
    params
  })
}

/**
 * 获取数据详情
 * @param {String|Number} id - 数据ID
 * @returns {Promise} 返回数据详情
 */
export const getYourDataDetail = (id) => {
  return request({
    url: `/your-module/${id}`,
    method: 'get'
  })
}

/**
 * 创建数据
 * @param {Object} data - 数据对象
 * @returns {Promise} 返回创建结果
 */
export const createYourData = (data) => {
  return request({
    url: '/your-module',
    method: 'post',
    data
  })
}
```

### 步骤 4：添加 Mock 数据

在 `src/mock/modules/` 目录下创建对应的 Mock 文件。

**目录结构：**

```
src/mock/modules/yourModule.js
```

**示例：**

```javascript
/**
 * 文件名称：yourModule.js - 业务模块 Mock 数据
 *
 * 功能描述：
 *   提供业务模块相关的 Mock 数据
 */

import Mock from 'mockjs'

/**
 * 获取数据列表
 */
Mock.mock(/\/api\/your-module\/list/, 'get', (options) => {
  return Mock.mock({
    code: 200,
    message: '获取成功',
    'data|10-20': [
      {
        'id|+1': 1,
        name: '@cname',
        description: '@cparagraph(1, 3)',
        createTime: '@datetime',
        'status|1': [0, 1, 2]
      }
    ]
  })
})

/**
 * 获取数据详情
 */
Mock.mock(/\/api\/your-module\/\d+/, 'get', (options) => {
  return Mock.mock({
    code: 200,
    message: '获取成功',
    data: {
      id: 1,
      name: '@cname',
      description: '@cparagraph(2, 5)',
      createTime: '@datetime',
      updateTime: '@datetime',
      status: 1
    }
  })
})

/**
 * 创建数据
 */
Mock.mock(/\/api\/your-module/, 'post', (options) => {
  return Mock.mock({
    code: 200,
    message: '创建成功',
    data: {
      id: '@id'
    }
  })
})
```

**注意：** 创建 Mock 文件后，需要在 `src/mock/index.js` 中导入：

```javascript
import './modules/yourModule'
```

### 步骤 5：添加状态管理（如需要）

如果业务功能需要全局状态管理，在 `src/stores/` 目录下创建对应的 Store。

**目录结构：**

```
src/stores/yourModuleStore.js
```

**示例：**

```javascript
/**
 * 文件名称：yourModuleStore.js - 业务模块状态管理
 *
 * 功能描述：
 *   管理业务模块相关的全局状态
 *
 * 使用方式：
 *   import { useYourModuleStore } from '@/stores/yourModuleStore'
 *   const yourModuleStore = useYourModuleStore()
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getYourDataList } from '@/api/modules/yourModuleApi'

export const useYourModuleStore = defineStore('yourModule', () => {
  // ========== State ==========

  /** @type {import('vue').Ref<Array>} 数据列表 */
  const dataList = ref([])

  /** @type {import('vue').Ref<boolean>} 加载状态 */
  const loading = ref(false)

  // ========== Getters ==========

  /**
   * 获取数据总数
   * @returns {number} 数据总数
   */
  const dataCount = computed(() => dataList.value.length)

  // ========== Actions ==========

  /**
   * 获取数据列表
   * @param {Object} params - 查询参数
   */
  const fetchDataList = async (params = {}) => {
    loading.value = true
    try {
      const res = await getYourDataList(params)
      if (res.code === 200) {
        dataList.value = res.data
      }
    } catch (error) {
      console.error('获取数据列表失败：', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空数据列表
   */
  const clearDataList = () => {
    dataList.value = []
  }

  return {
    // State
    dataList,
    loading,
    // Getters
    dataCount,
    // Actions
    fetchDataList,
    clearDataList
  }
})
```

## 开发提示

在开发业务功能时，请注意以下要点：

### 📖 参考文档

- **README_DEV.md**：了解详细的开发规范、代码风格、命名规范等
- **CLAUDE.md**：了解 Claude Code 的使用指南和项目特定注意事项

### 🎨 样式规范

- **使用 CSS 变量**：保持样式一致性，所有颜色、间距、圆角都使用 CSS 变量

  ```css
  /* 推荐 */
  color: var(--primary-color);
  padding: var(--spacing-md);

  /* 不推荐 */
  color: #1171f8;
  padding: 16px;
  ```

### 📱 移动端适配

- **直接写 px 单位**：开发时直接使用 px，构建时会自动转换为 rem

  ```css
  /* 开发时写 */
  width: 375px;
  font-size: 14px;

  /* 构建后自动转换为 */
  width: 10rem;
  font-size: 0.37333rem;
  ```

### 🔧 代码注释

- **所有代码都需要添加中文注释**
- **页面顶部**：写上页面名称、功能描述、路由信息
- **组件顶部**：写上组件名称、功能描述、使用方式
- **函数方法**：使用 JSDoc 格式添加参数和返回值说明

### ✅ 最佳实践

- **组件化开发**：将可复用的部分抽取为组件
- **错误处理**：所有 API 调用都要添加 try-catch 错误处理
- **加载状态**：异步操作要显示加载状态，提升用户体验
- **数据验证**：表单提交前要进行数据验证
- **代码复用**：相同的逻辑抽取为工具函数或组合式函数

---

# 开发规范

## 1. 代码组织规范

### 1.1 文件命名规范

#### 组件文件

- **页面组件**：使用 PascalCase，如 `UserProfile.vue`、`OrderList.vue`
- **通用组件**：使用 PascalCase，如 `CustomButton.vue`、`DataTable.vue`
- **布局组件**：使用 PascalCase + Layout 后缀，如 `MainLayout.vue`、`EmptyLayout.vue`

#### JavaScript 文件

- **工具函数**：使用 camelCase，如 `formatDate.js`、`validator.js`
- **API 文件**：使用 camelCase，如 `userApi.js`、`orderApi.js`
- **Store 文件**：使用 camelCase，如 `userStore.js`、`appStore.js`
- **常量文件**：使用 camelCase 或 UPPER_CASE，如 `constants.js`、`API_CONSTANTS.js`

#### 样式文件

- **全局样式**：使用 kebab-case，如 `variables.css`、`reset.css`
- **组件样式**：使用 scoped 样式，写在 `.vue` 文件内

### 1.2 模块化组织规范

#### 按业务模块组织目录结构

```
src/
├── views/                    # 页面视图（按模块组织）
│   ├── auth/                 # 认证模块
│   │   ├── Login.vue
│   │   ├── Register.vue
│   │   └── ForgotPassword.vue
│   ├── user/                 # 用户模块
│   │   ├── Profile.vue
│   │   ├── Settings.vue
│   │   └── components/       # 模块内私有组件
│   │       └── AvatarUpload.vue
│   ├── order/                # 订单模块
│   │   ├── OrderList.vue
│   │   ├── OrderDetail.vue
│   │   └── components/
│   │       ├── OrderCard.vue
│   │       └── OrderStatus.vue
│   └── home/                 # 首页模块
│       └── Home.vue
├── components/               # 全局共享组件
│   ├── Layout/
│   │   ├── MainLayout.vue
│   │   ├── Header.vue
│   │   └── Footer.vue
│   └── Common/
│       ├── CustomButton.vue
│       └── LoadingSpinner.vue
├── api/                      # API 接口（按模块组织）
│   ├── modules/
│   │   ├── userApi.js
│   │   ├── orderApi.js
│   │   └── authApi.js
│   └── request.js            # Axios 封装
├── stores/                   # 状态管理（按模块组织）
│   ├── userStore.js
│   ├── orderStore.js
│   └── appStore.js
├── mock/                     # Mock 数据（按模块组织）
│   ├── modules/
│   │   ├── user.js
│   │   ├── order.js
│   │   └── auth.js
│   └── index.js              # Mock 配置入口
└── utils/                    # 工具函数
    ├── format.js
    ├── validator.js
    └── storage.js
```

#### 模块划分原则

1. **按业务功能划分**：每个业务模块独立一个文件夹
2. **高内聚低耦合**：模块内部组件尽量自包含，减少跨模块依赖
3. **共享组件提取**：被多个模块使用的组件放到 `components/` 目录
4. **私有组件内聚**：只在单个模块内使用的组件放在模块的 `components/` 子目录

#### 完整模块示例

以"订单模块"为例，完整的文件组织：

```
order/                        # 订单模块
├── OrderList.vue             # 订单列表页
├── OrderDetail.vue           # 订单详情页
├── CreateOrder.vue           # 创建订单页
├── components/               # 模块私有组件
│   ├── OrderCard.vue         # 订单卡片
│   ├── OrderStatus.vue       # 订单状态
│   └── OrderTimeline.vue     # 订单时间线
└── composables/              # 模块私有组合式函数（可选）
    └── useOrderFilter.js     # 订单筛选逻辑
```

对应的 API、Store、Mock 文件：

```
api/modules/orderApi.js       # 订单 API
stores/orderStore.js          # 订单状态管理
mock/modules/order.js         # 订单 Mock 数据
```

### 1.3 代码文件结构规范

#### Vue 组件文件顺序

```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup>
// 1. 导入依赖
// 2. Props 定义
// 3. Emits 定义
// 4. 响应式数据
// 5. 计算属性
// 6. 方法
// 7. 生命周期钩子
// 8. 监听器
</script>

<style scoped>
/* 组件样式 */
</style>
```

#### JavaScript 文件顺序

```javascript
// 1. 导入依赖
// 2. 常量定义
// 3. 函数定义
// 4. 导出
```

## 2. Mock 数据规范

### 2.1 Mock 数据使用场景

本项目支持两种 Mock 数据定义方式，根据数据复杂度选择：

| 场景            | 使用方式                      | 适用情况                     |
| --------------- | ----------------------------- | ---------------------------- |
| **组件内 Mock** | 直接在 Vue 组件中定义         | 简单数据、临时测试、快速原型 |
| **Mock 文件夹** | 在 `src/mock/modules/` 中定义 | 复杂数据、多接口、团队共享   |

#### 判断标准

**使用组件内 Mock**：

- 数据结构简单（少于 20 行）
- 仅当前组件使用
- 临时测试或快速验证功能
- 静态数据列表（如下拉选项）

**使用 Mock 文件夹**：

- 数据结构复杂（超过 20 行）
- 多个组件共享
- 需要模拟真实 API 响应
- 包含多个接口的业务模块

### 2.2 组件内 Mock 数据

#### 适用场景示例

1. **简单列表数据**
2. **表单选项数据**
3. **静态配置数据**
4. **临时测试数据**

#### 完整示例 1：简单列表页面

```vue
<template>
  <div class="product-list">
    <van-nav-bar title="商品列表" />

    <van-list>
      <van-cell
        v-for="item in productList"
        :key="item.id"
        :title="item.name"
        :label="item.description"
        :value="`¥${item.price}`"
      />
    </van-list>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 组件内 Mock 数据 - 简单商品列表
const productList = ref([
  { id: 1, name: 'iPhone 15 Pro', description: '256GB 黑色', price: 8999 },
  { id: 2, name: 'MacBook Pro', description: 'M3 芯片 16GB', price: 15999 },
  { id: 3, name: 'AirPods Pro', description: '第二代', price: 1899 },
  { id: 4, name: 'iPad Air', description: '11英寸 128GB', price: 4799 }
])
</script>

<style scoped>
.product-list {
  min-height: 100vh;
  background-color: #f7f8fa;
}
</style>
```

#### 完整示例 2：表单选项数据

```vue
<template>
  <div class="user-form">
    <van-nav-bar title="用户信息" />

    <van-form @submit="onSubmit">
      <van-field v-model="formData.name" name="name" label="姓名" placeholder="请输入姓名" />

      <van-field
        v-model="formData.gender"
        name="gender"
        label="性别"
        placeholder="请选择性别"
        readonly
        @click="showGenderPicker = true"
      />

      <van-field
        v-model="formData.city"
        name="city"
        label="城市"
        placeholder="请选择城市"
        readonly
        @click="showCityPicker = true"
      />

      <div style="margin: 16px;">
        <van-button round block type="primary" native-type="submit"> 提交 </van-button>
      </div>
    </van-form>

    <!-- 性别选择器 -->
    <van-popup v-model:show="showGenderPicker" position="bottom">
      <van-picker
        :columns="genderOptions"
        @confirm="onGenderConfirm"
        @cancel="showGenderPicker = false"
      />
    </van-popup>

    <!-- 城市选择器 -->
    <van-popup v-model:show="showCityPicker" position="bottom">
      <van-picker
        :columns="cityOptions"
        @confirm="onCityConfirm"
        @cancel="showCityPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { showToast } from 'vant'

// 组件内 Mock 数据 - 表单选项
const genderOptions = [
  { text: '男', value: 'male' },
  { text: '女', value: 'female' },
  { text: '其他', value: 'other' }
]

const cityOptions = [
  { text: '北京', value: 'beijing' },
  { text: '上海', value: 'shanghai' },
  { text: '广州', value: 'guangzhou' },
  { text: '深圳', value: 'shenzhen' },
  { text: '杭州', value: 'hangzhou' }
]

// 表单数据
const formData = reactive({
  name: '',
  gender: '',
  city: ''
})

const showGenderPicker = ref(false)
const showCityPicker = ref(false)

// 性别选择确认
const onGenderConfirm = ({ selectedOptions }) => {
  formData.gender = selectedOptions[0].text
  showGenderPicker.value = false
}

// 城市选择确认
const onCityConfirm = ({ selectedOptions }) => {
  formData.city = selectedOptions[0].text
  showCityPicker.value = false
}

// 表单提交
const onSubmit = (values) => {
  console.log('提交数据：', values)
  showToast('提交成功')
}
</script>

<style scoped>
.user-form {
  min-height: 100vh;
  background-color: #f7f8fa;
}
</style>
```

#### 完整示例 3：静态配置数据

```vue
<template>
  <div class="dashboard">
    <van-nav-bar title="数据看板" />

    <div class="stats-grid">
      <div v-for="stat in statsData" :key="stat.id" class="stat-card">
        <div class="stat-icon" :style="{ backgroundColor: stat.color }">
          {{ stat.icon }}
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 组件内 Mock 数据 - 统计数据
const statsData = ref([
  { id: 1, icon: '👥', label: '总用户数', value: '12,345', color: '#1171F8' },
  { id: 2, icon: '📦', label: '订单数', value: '8,901', color: '#07C160' },
  { id: 3, icon: '💰', label: '总收入', value: '¥234,567', color: '#FF976A' },
  { id: 4, icon: '⭐', label: '好评率', value: '98.5%', color: '#EE0A24' }
])
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #969799;
}
</style>
```

### 2.3 Mock 文件夹数据

#### 适用场景

1. **复杂业务数据**：包含多层嵌套、大量字段
2. **多接口模块**：一个业务模块有多个 API 接口
3. **团队共享数据**：多个组件需要使用相同的 Mock 数据
4. **真实 API 模拟**：需要模拟完整的请求/响应流程

#### Mock 文件组织结构

```
src/mock/
├── index.js              # Mock 配置入口
├── modules/              # 按业务模块组织
│   ├── user.js           # 用户模块 Mock
│   ├── order.js          # 订单模块 Mock
│   ├── product.js        # 商品模块 Mock
│   └── auth.js           # 认证模块 Mock
└── utils/                # Mock 工具函数（可选）
    └── mockHelper.js     # Mock 辅助函数
```

#### 统一响应格式

所有 Mock 接口必须遵循统一的响应格式：

```javascript
// 成功响应
{
  code: 200,
  data: { /* 业务数据 */ },
  message: '操作成功'
}

// 失败响应
{
  code: 400,  // 或其他错误码
  data: null,
  message: '错误信息描述'
}
```

#### 完整示例：用户模块 Mock

**文件：`src/mock/modules/user.js`**

```javascript
import Mock from 'mockjs'

/**
 * 用户状态枚举
 * @typedef {'active'|'inactive'|'banned'} UserStatus
 */

/**
 * 用户性别枚举
 * @typedef {'male'|'female'} UserGender
 */

/**
 * 用户信息
 * @typedef {Object} UserInfo
 * @property {number|string} id - 用户ID
 * @property {string} name - 用户名
 * @property {number} age - 年龄
 * @property {string} email - 邮箱
 * @property {string} phone - 手机号
 * @property {string} avatar - 头像
 * @property {UserGender} gender - 性别
 * @property {string} address - 地址
 * @property {UserStatus} status - 状态
 * @property {string} createTime - 创建时间
 * @property {string} updateTime - 更新时间
 */

/**
 * 用户列表响应
 * @typedef {Object} UserListResponse
 * @property {number} code - 响应码
 * @property {string} message - 响应消息
 * @property {UserInfo[]} data - 用户列表数据
 */

/**
 * 用户详情响应
 * @typedef {Object} UserDetailResponse
 * @property {number} code - 响应码
 * @property {string} message - 响应消息
 * @property {UserInfo} data - 用户详情数据
 */

/**
 * 获取用户列表
 * @returns {UserListResponse} Mock 响应数据
 */
export const getUserList = () => {
  return Mock.mock({
    code: 200,
    message: '获取成功',
    'data|10-20': [
      {
        'id|+1': 1,
        name: '@cname',
        'age|18-60': 25,
        email: '@email',
        phone: /^1[3-9]\d{9}$/,
        avatar: '@image("100x100", "@color", "#FFF", "@name")',
        'gender|1': ['male', 'female'],
        address: '@county(true)',
        'status|1': ['active', 'inactive'],
        createTime: '@datetime("yyyy-MM-dd HH:mm:ss")'
      }
    ]
  })
}

/**
 * 获取用户详情
 * @param {string|number} userId - 用户ID
 * @returns {UserDetailResponse} Mock 响应数据
 */
export const getUserDetail = (userId) => {
  return Mock.mock({
    code: 200,
    message: '获取成功',
    data: {
      id: userId || '@id',
      name: '@cname',
      'age|18-60': 25,
      email: '@email',
      phone: /^1[3-9]\d{9}$/,
      avatar: '@image("200x200")',
      'gender|1': ['male', 'female'],
      address: '@county(true)',
      bio: '@cparagraph(1, 3)',
      profile: {
        company: '@ctitle(5, 10)',
        position: '@ctitle(3, 5)',
        'experience|1-10': 5
      }
    }
  })
}

/**
 * 更新用户信息
 * @param {Partial<UserInfo>} userData - 用户数据
 * @returns {UserDetailResponse} Mock 响应数据
 */
export const updateUser = (userData) => {
  return Mock.mock({
    code: 200,
    message: '更新成功',
    data: {
      ...userData,
      updateTime: '@datetime("yyyy-MM-dd HH:mm:ss")'
    }
  })
}
```

#### Mock 配置入口文件

**文件：`src/mock/index.js`**

```javascript
import Mock from 'mockjs'
import { getUserList, getUserDetail, updateUser } from './modules/user'

// 配置 Mock
Mock.setup({
  timeout: '200-600' // 模拟网络延迟
})

/**
 * 用户相关接口
 */
Mock.mock(/\/api\/users$/, 'get', getUserList)

Mock.mock(/\/api\/users\/\d+$/, 'get', (options) => {
  const userId = options.url.match(/\/api\/users\/(\d+)$/)[1]
  return getUserDetail(userId)
})

Mock.mock(/\/api\/users\/\d+$/, 'put', (options) => {
  const userData = JSON.parse(options.body)
  return updateUser(userData)
})

export default Mock
```

#### 在组件中使用 Mock 数据

**方式1：通过 API 调用（推荐）**

```vue
<template>
  <div class="user-list">
    <van-list v-model:loading="loading" :finished="finished">
      <van-cell v-for="user in userList" :key="user.id" :title="user.name" :label="user.email" />
    </van-list>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUserListApi } from '@/api/modules/userApi'

const userList = ref([])
const loading = ref(false)
const finished = ref(false)

const fetchUserList = async () => {
  loading.value = true
  try {
    const res = await getUserListApi()
    if (res.code === 200) {
      userList.value = res.data
    }
  } finally {
    loading.value = false
    finished.value = true
  }
}

onMounted(() => {
  fetchUserList()
})
</script>
```

### 2.4 Mock 数据最佳实践

1. **优先使用 Mock 文件夹**：除非是非常简单的静态数据
2. **保持数据真实性**：Mock 数据应接近真实业务场景
3. **统一响应格式**：所有接口遵循统一格式
4. **模拟网络延迟**：使用 `Mock.setup({ timeout: '200-600' })`
5. **数据量合理**：列表使用 `'data|10-20'` 生成合理数量

## 3. Vue 3 组件开发规范

### 3.1 组件结构规范

#### 标准组件结构

所有组件必须使用 `<script setup>` 语法，按以下顺序组织代码：

```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup>
// 1. 导入依赖
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

// 2. Props 定义（使用 JSDoc 注释）
/**
 * @typedef {Object} Props
 * @property {string} value - 值
 */
const props = defineProps({
  value: String
})

// 3. Emits 定义（使用 JSDoc 注释）
/**
 * @typedef {Function} Emits
 */
const emit = defineEmits(['update', 'delete'])

// 4. 响应式数据（使用 JSDoc 注释）
/** @type {import('vue').Ref<number>} */
const count = ref(0)

// 5. 计算属性
const doubleCount = computed(() => count.value * 2)

// 6. 方法
const handleClick = () => {
  count.value++
}

// 7. 生命周期钩子
onMounted(() => {
  console.log('组件已挂载')
})

// 8. 监听器
watch(
  () => props.value,
  (newVal) => {
    console.log('props changed:', newVal)
  }
)
</script>

<style scoped>
/* 组件样式 */
</style>
```

### 3.2 Props 定义规范

#### Props 定义要求

1. **使用 JSDoc 添加类型注释**
2. **必须指定类型**
3. **必须提供默认值**（除非是必填项）
4. **添加注释说明**

#### 完整示例：Props 定义

```vue
<script setup>
import { computed } from 'vue'

/**
 * Props 类型定义
 * @typedef {Object} Props
 * @property {string|number} userId - 用户ID（必填）
 * @property {string} [userName=''] - 用户名（可选）
 * @property {'active'|'inactive'|'banned'} [status='active'] - 用户状态（可选）
 * @property {string[]} [tags=[]] - 用户标签（可选）
 * @property {Object} [config={}] - 用户配置（可选）
 * @property {boolean} [visible=true] - 是否显示（可选）
 */

// Props 定义
const props = defineProps({
  // 用户ID - 必填
  userId: {
    type: [String, Number],
    required: true
  },

  // 用户名 - 可选，默认为空字符串
  userName: {
    type: String,
    default: ''
  },

  // 用户状态 - 可选，默认为 active
  status: {
    type: String,
    default: 'active',
    validator: (value) => {
      return ['active', 'inactive', 'banned'].includes(value)
    }
  },

  // 用户标签 - 可选，默认为空数组
  tags: {
    type: Array,
    default: () => []
  },

  // 用户配置 - 可选，默认为空对象
  config: {
    type: Object,
    default: () => ({})
  },

  // 是否显示 - 可选，默认为 true
  visible: {
    type: Boolean,
    default: true
  }
})

// 使用 Props
const displayName = computed(() => {
  return props.userName || `用户${props.userId}`
})
</script>
```

### 3.3 Emits 定义规范

#### Emits 定义要求

1. **使用 JSDoc 添加类型注释**
2. **明确声明所有事件**
3. **使用 kebab-case 命名**

#### 完整示例：Emits 定义

```vue
<script setup>
import { ref } from 'vue'

/**
 * Emits 事件定义
 * @typedef {Object} Emits
 * @property {Function} update:modelValue - 更新事件，传递新值
 * @property {Function} submit - 提交事件，传递表单数据
 * @property {Function} delete - 删除事件，传递ID
 * @property {Function} cancel - 取消事件，无参数
 */

// Emits 定义
const emit = defineEmits({
  // 更新事件 - 传递新值
  'update:modelValue': (value) => {
    return typeof value === 'string'
  },

  // 提交事件 - 传递表单数据
  submit: (formData) => {
    return formData && typeof formData === 'object'
  },

  // 删除事件 - 传递ID
  delete: (id) => {
    return typeof id === 'number' || typeof id === 'string'
  },

  // 取消事件 - 无参数
  cancel: null
})

/**
 * 处理提交
 * @param {Object} data - 表单数据
 */
const handleSubmit = (data) => {
  emit('submit', data)
}

/**
 * 处理删除
 * @param {number|string} id - ID
 */
const handleDelete = (id) => {
  emit('delete', id)
}
</script>
```

### 3.4 完整组件示例

#### 示例：用户卡片组件

```vue
<template>
  <div class="user-card" :class="{ 'is-active': isActive }">
    <div class="user-avatar">
      <img :src="user.avatar" :alt="user.name" />
      <van-tag v-if="showStatus" :type="statusType">
        {{ statusText }}
      </van-tag>
    </div>

    <div class="user-info">
      <h3 class="user-name">{{ user.name }}</h3>
      <p class="user-email">{{ user.email }}</p>
      <div class="user-tags">
        <van-tag v-for="tag in user.tags" :key="tag" plain size="small">
          {{ tag }}
        </van-tag>
      </div>
    </div>

    <div class="user-actions">
      <van-button size="small" type="primary" @click="handleEdit"> 编辑 </van-button>
      <van-button size="small" type="danger" @click="handleDelete"> 删除 </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { showConfirmDialog } from 'vant'

/**
 * 用户信息类型
 * @typedef {Object} UserInfo
 * @property {number|string} id - 用户ID
 * @property {string} name - 用户名
 * @property {string} email - 邮箱
 * @property {string} avatar - 头像
 * @property {'active'|'inactive'|'banned'} status - 状态
 * @property {string[]} [tags] - 标签
 */

/**
 * Props 类型定义
 * @typedef {Object} Props
 * @property {UserInfo} user - 用户数据
 * @property {boolean} [showStatus=true] - 是否显示状态标签
 * @property {boolean} [active=false] - 是否激活状态
 */

// Props 定义
const props = defineProps({
  // 用户数据
  user: {
    type: Object,
    required: true,
    validator: (value) => {
      return value.id && value.name && value.email
    }
  },

  // 是否显示状态标签
  showStatus: {
    type: Boolean,
    default: true
  },

  // 是否激活状态
  active: {
    type: Boolean,
    default: false
  }
})

// Emits 定义
const emit = defineEmits({
  edit: (user) => user && typeof user === 'object',
  delete: (userId) => typeof userId === 'number' || typeof userId === 'string'
})

// 响应式数据
/** @type {import('vue').Ref<boolean>} */
const isActive = ref(props.active)

// 计算属性
const statusType = computed(() => {
  const statusMap = {
    active: 'success',
    inactive: 'warning',
    banned: 'danger'
  }
  return statusMap[props.user.status] || 'default'
})

const statusText = computed(() => {
  const textMap = {
    active: '正常',
    inactive: '未激活',
    banned: '已禁用'
  }
  return textMap[props.user.status] || '未知'
})

// 方法
/**
 * 处理编辑
 */
const handleEdit = () => {
  emit('edit', props.user)
}

/**
 * 处理删除
 */
const handleDelete = async () => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除用户 ${props.user.name} 吗？`
    })
    emit('delete', props.user.id)
  } catch {
    // 用户取消
  }
}

// 监听器
watch(
  () => props.active,
  (newVal) => {
    isActive.value = newVal
  }
)
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  transition: all 0.3s;
}

.user-card.is-active {
  border: 2px solid var(--primary-color);
}

.user-avatar {
  position: relative;
  flex-shrink: 0;
}

.user-avatar img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar .van-tag {
  position: absolute;
  bottom: 0;
  right: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 4px 0;
  color: #323233;
}

.user-email {
  font-size: 14px;
  color: #969799;
  margin: 0 0 8px 0;
}

.user-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.user-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
```

## 4. API 接口规范

### 4.1 API 文件组织

#### 目录结构

```
src/api/
├── request.js            # Axios 封装
├── modules/              # 按模块组织
│   ├── userApi.js        # 用户接口
│   ├── orderApi.js       # 订单接口
│   ├── productApi.js     # 商品接口
│   └── authApi.js        # 认证接口
└── index.js              # 统一导出（可选）
```

### 4.2 Axios 封装规范

**文件：`src/api/request.js`**

```javascript
import axios from 'axios'
import { showToast } from 'vant'

/**
 * 通用响应接口
 * @typedef {Object} ApiResponse
 * @property {number} code - 响应码
 * @property {*} data - 响应数据
 * @property {string} message - 响应消息
 */

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加 token
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, data, message } = response.data

    // 成功响应
    if (code === 200) {
      return response.data
    }

    // 业务错误
    showToast(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    // 网络错误
    if (error.response) {
      const { status } = error.response
      const errorMap = {
        401: '未授权，请重新登录',
        403: '拒绝访问',
        404: '请求的资源不存在',
        500: '服务器错误',
        502: '网关错误',
        503: '服务不可用'
      }
      showToast(errorMap[status] || '请求失败')
    } else {
      showToast('网络连接失败')
    }
    return Promise.reject(error)
  }
)

export default request
```

### 4.3 API 接口定义规范

#### 接口定义要求

1. **使用命名导出**：不使用 default export
2. **函数命名清晰**：动词 + 名词，如 `getUserList`、`createOrder`
3. **使用 JSDoc 添加类型注释**
4. **添加注释说明**：说明接口用途、参数、返回值

#### 完整示例：用户模块 API

**文件：`src/api/modules/userApi.js`**

```javascript
import request from '../request'

/**
 * 用户查询参数
 * @typedef {Object} UserListParams
 * @property {number} [page] - 页码
 * @property {number} [pageSize] - 每页数量
 * @property {string} [keyword] - 搜索关键词
 */

/**
 * 用户信息
 * @typedef {Object} UserInfo
 * @property {number|string} id - 用户ID
 * @property {string} name - 用户名
 * @property {string} email - 邮箱
 * @property {string} phone - 手机号
 * @property {string} [avatar] - 头像
 * @property {'active'|'inactive'|'banned'} status - 状态
 */

/**
 * 获取用户列表
 * @param {UserListParams} params - 查询参数
 * @returns {Promise<Object>} 用户列表数据
 */
export const getUserList = (params) => {
  return request({
    url: '/users',
    method: 'get',
    params
  })
}

/**
 * 获取用户详情
 * @param {string|number} userId - 用户ID
 * @returns {Promise<Object>} 用户详情数据
 */
export const getUserDetail = (userId) => {
  return request({
    url: `/users/${userId}`,
    method: 'get'
  })
}

/**
 * 创建用户
 * @param {Partial<UserInfo>} data - 用户数据
 * @returns {Promise<Object>} 创建结果
 */
export const createUser = (data) => {
  return request({
    url: '/users',
    method: 'post',
    data
  })
}

/**
 * 更新用户信息
 * @param {string|number} userId - 用户ID
 * @param {Partial<UserInfo>} data - 更新的数据
 * @returns {Promise<Object>} 更新结果
 */
export const updateUser = (userId, data) => {
  return request({
    url: `/users/${userId}`,
    method: 'put',
    data
  })
}

/**
 * 删除用户
 * @param {string|number} userId - 用户ID
 * @returns {Promise<Object>} 删除结果
 */
export const deleteUser = (userId) => {
  return request({
    url: `/users/${userId}`,
    method: 'delete'
  })
}

/**
 * 搜索用户
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Object>} 搜索结果
 */
export const searchUser = (keyword) => {
  return request({
    url: '/users/search',
    method: 'get',
    params: { keyword }
  })
}
```

## 5. Pinia 状态管理规范

### 5.1 Store 文件组织

#### 目录结构

```
src/stores/
├── userStore.js          # 用户状态
├── orderStore.js         # 订单状态
├── appStore.js           # 应用全局状态
└── index.js              # 统一导出（可选）
```

### 5.2 Store 定义规范

#### Store 定义要求

1. **使用 Composition API 风格**
2. **明确划分 state、getters、actions**
3. **使用 JSDoc 添加类型注释**
4. **异步操作放在 actions 中**

#### 完整示例：用户 Store

**文件：`src/stores/userStore.js`**

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getUserDetail, updateUser } from '@/api/modules/userApi'

/**
 * 用户信息类型
 * @typedef {Object} UserInfo
 * @property {number|string} id - 用户ID
 * @property {string} name - 用户名
 * @property {string} email - 邮箱
 * @property {string} [avatar] - 头像
 */

export const useUserStore = defineStore('user', () => {
  // State
  /** @type {import('vue').Ref<UserInfo|null>} */
  const userInfo = ref(null)

  /** @type {import('vue').Ref<string>} */
  const token = ref(localStorage.getItem('token') || '')

  /** @type {import('vue').Ref<boolean>} */
  const isLogin = ref(false)

  // Getters
  const userId = computed(() => userInfo.value?.id || '')
  const userName = computed(() => userInfo.value?.name || '未登录')
  const userAvatar = computed(() => userInfo.value?.avatar || '')

  // Actions
  /**
   * 设置 Token
   * @param {string} newToken - 新的 token
   */
  const setToken = (newToken) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  /**
   * 设置用户信息
   * @param {UserInfo} info - 用户信息
   */
  const setUserInfo = (info) => {
    userInfo.value = info
    isLogin.value = true
  }

  /**
   * 获取用户信息
   * @returns {Promise<Object>}
   */
  const fetchUserInfo = async () => {
    try {
      const res = await getUserDetail(userId.value)
      if (res.code === 200) {
        setUserInfo(res.data)
      }
      return res
    } catch (error) {
      console.error('获取用户信息失败：', error)
      throw error
    }
  }

  /**
   * 更新用户信息
   * @param {Partial<UserInfo>} data - 更新的数据
   * @returns {Promise<Object>}
   */
  const updateUserInfo = async (data) => {
    try {
      const res = await updateUser(userId.value, data)
      if (res.code === 200 && userInfo.value) {
        setUserInfo({ ...userInfo.value, ...data })
      }
      return res
    } catch (error) {
      console.error('更新用户信息失败：', error)
      throw error
    }
  }

  /**
   * 登出
   */
  const logout = () => {
    userInfo.value = null
    token.value = ''
    isLogin.value = false
    localStorage.removeItem('token')
  }

  return {
    // State
    userInfo,
    token,
    isLogin,
    // Getters
    userId,
    userName,
    userAvatar,
    // Actions
    setToken,
    setUserInfo,
    fetchUserInfo,
    updateUserInfo,
    logout
  }
})
```

## 6. 路由规范

### 6.1 路由配置规范

#### 路由命名规范

1. **路径使用 kebab-case**：如 `/user-profile`、`/order-list`
2. **路由名称使用 PascalCase**：如 `UserProfile`、`OrderList`
3. **模块路由统一前缀**：如 `/user/*`、`/order/*`

#### 完整示例：路由配置

**文件：`src/router/index.js`**

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

/**
 * 路由 Meta 信息
 * @typedef {Object} RouteMeta
 * @property {string} [title] - 页面标题
 * @property {boolean} [requiresAuth] - 是否需要登录
 */

// 路由配置
const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/home/Home.vue'),
    meta: {
      title: '首页',
      requiresAuth: false
    }
  },
  {
    path: '/user',
    name: 'User',
    redirect: '/user/profile',
    meta: {
      title: '用户中心',
      requiresAuth: true
    },
    children: [
      {
        path: 'profile',
        name: 'UserProfile',
        component: () => import('@/views/user/Profile.vue'),
        meta: {
          title: '个人资料'
        }
      },
      {
        path: 'settings',
        name: 'UserSettings',
        component: () => import('@/views/user/Settings.vue'),
        meta: {
          title: '设置'
        }
      }
    ]
  },
  {
    path: '/order',
    name: 'Order',
    redirect: '/order/list',
    meta: {
      title: '订单',
      requiresAuth: true
    },
    children: [
      {
        path: 'list',
        name: 'OrderList',
        component: () => import('@/views/order/OrderList.vue'),
        meta: {
          title: '订单列表'
        }
      },
      {
        path: 'detail/:id',
        name: 'OrderDetail',
        component: () => import('@/views/order/OrderDetail.vue'),
        meta: {
          title: '订单详情'
        }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/NotFound.vue'),
    meta: {
      title: '页面不存在'
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || 'H5应用'

  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    const userStore = useUserStore()
    if (!userStore.isLogin) {
      next({
        name: 'Login',
        query: { redirect: to.fullPath }
      })
      return
    }
  }

  next()
})

export default router
```

## 7. 样式规范

### 7.1 CSS 变量使用规范

#### 全局 CSS 变量

**文件：`src/assets/styles/variables.css`**

```css
:root {
  /* 主题色 */
  --primary-color: #1171f8;
  --success-color: #07c160;
  --warning-color: #ff976a;
  --danger-color: #ee0a24;
  --info-color: #1171f8;

  /* 文字色 */
  --text-primary: #323233;
  --text-secondary: #969799;
  --text-disabled: #c8c9cc;

  /* 背景色 */
  --bg-page: #f7f8fa;
  --bg-card: #ffffff;

  /* 边框色 */
  --border-color: #ebedf0;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
}
```

#### 在组件中使用 CSS 变量

```vue
<style scoped>
.card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
}

.title {
  color: var(--text-primary);
  font-size: 16px;
  margin-bottom: var(--spacing-sm);
}

.button-primary {
  background: var(--primary-color);
  color: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
}
</style>
```

### 7.2 Scoped 样式规范

1. **所有组件样式必须使用 scoped**
2. **避免使用深度选择器**（除非必要）
3. **使用 CSS 变量保持一致性**

### 7.3 Vant 组件样式覆盖

**文件：`src/assets/styles/vant-custom.css`**

```css
/* 覆盖 Vant 主题色 */
:root:root {
  --van-primary-color: #1171f8;
  --van-success-color: #07c160;
  --van-warning-color: #ff976a;
  --van-danger-color: #ee0a24;
}

/* 自定义 Vant 组件样式 */
.van-button--primary {
  border-radius: 8px;
}

.van-nav-bar {
  background: linear-gradient(135deg, #1171f8 0%, #0d5ac7 100%);
}
```

## 8. Git 工作流规范

### 8.1 分支命名规范

#### 分支类型

- **feature/**：新功能开发，如 `feature/user-login`
- **bugfix/**：Bug 修复，如 `bugfix/fix-login-error`
- **hotfix/**：紧急修复，如 `hotfix/fix-payment-issue`
- **refactor/**：代码重构，如 `refactor/optimize-api`
- **docs/**：文档更新，如 `docs/update-readme`

### 8.2 Commit 信息规范

#### Commit 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

- **feat**：新功能
- **fix**：Bug 修复
- **docs**：文档更新
- **style**：代码格式调整（不影响功能）
- **refactor**：代码重构
- **test**：测试相关
- **chore**：构建/工具相关

#### 示例

```bash
feat(user): 添加用户登录功能

- 实现登录表单验证
- 集成登录 API
- 添加登录状态管理

Closes #123
```

### 8.3 开发流程

1. **创建分支**：从 `main` 创建功能分支
2. **开发功能**：在功能分支上开发
3. **提交代码**：遵循 Commit 规范提交
4. **代码审查**：提交 Pull Request
5. **合并代码**：审查通过后合并到 `main`

## 联系方式

如有问题，请查看项目文档或联系开发团队。

---

**开发完成时间**: 2025-12-05
**版本**: v1.0.0
