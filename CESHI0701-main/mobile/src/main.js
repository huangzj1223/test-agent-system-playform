/**
 * 文件名称：main.js - 应用入口文件
 *
 * 功能描述：
 *   Vue 应用的主入口文件，负责应用的初始化和配置
 *   包括创建 Vue 实例、注册插件、导入全局样式等
 *
 * 主要功能：
 *   - 创建 Vue 应用实例
 *   - 注册 Pinia 状态管理
 *   - 注册 Vue Router 路由
 *   - 导入全局样式和 Mock 数据
 *   - 挂载应用到 DOM
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 导入移动端 rem 适配方案（必须在最前面引入）
import '@/utils/flexible'

// 导入 Vant UI 组件库样式
import 'vant/lib/index.css'

// 导入全局样式文件
import '@/assets/styles/variables.css' // CSS 变量（主题色等）
import '@/assets/styles/main.css' // 全局样式
import '@/assets/styles/transition.css' // 页面过渡动画样式
import '@/assets/styles/vant-custom.css' // Vant 组件自定义样式

// 导入 Mock 数据配置（开发环境使用）
import '@/mock'

// 创建 Vue 应用实例
const app = createApp(App)

// 注册 Pinia 状态管理
app.use(createPinia())

// 注册 Vue Router 路由
app.use(router)

// 将应用挂载到 #app 元素
app.mount('#app')
