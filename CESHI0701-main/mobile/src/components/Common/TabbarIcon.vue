<!--
  组件名称：TabbarIcon - 底部导航栏图标组件

  功能描述：
    用于底部导航栏的自定义 SVG 图标组件，支持四种图标类型（首页、工作台、消息、我的）
    根据激活状态自动切换图标颜色

  使用方式：
    <TabbarIcon name="home" :active="true" />
    <TabbarIcon name="workspace" :active="false" />
    <TabbarIcon name="message" :active="false" />
    <TabbarIcon name="profile" :active="true" activeColor="#1171F8" />

  Props:
    - name: 图标名称，可选值 'home' | 'workspace' | 'message' | 'profile'
    - active: 是否激活状态，默认 false
    - activeColor: 激活时的颜色，默认 '#1171F8'
    - inactiveColor: 未激活时的颜色，默认 '#969799'
-->

<template>
  <div class="tabbar-icon">
    <!-- 首页图标 -->
    <svg
      v-if="name === 'home'"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      :fill="active ? activeColor : inactiveColor"
    >
      <path
        d="M946.5 505L560.1 118.8l-25.9-25.9a31.5 31.5 0 0 0-44.4 0L77.5 505a63.9 63.9 0 0 0-18.8 46c0.4 35.2 29.7 63.3 64.9 63.3h42.5V940h691.8V614.3h43.4c17.1 0 33.2-6.7 45.3-18.8a63.6 63.6 0 0 0 18.7-45.3c0-17-6.7-33.1-18.8-45.2zM568 868H456V664h112v204zm217.9-325.7V868H632V640c0-22.1-17.9-40-40-40H432c-22.1 0-40 17.9-40 40v228H238.1V542.3h-96l370-369.7 23.1 23.1L882 542.3h-96.1z"
      />
    </svg>

    <!-- 工作台图标 -->
    <svg
      v-else-if="name === 'workspace'"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      :fill="active ? activeColor : inactiveColor"
    >
      <path
        d="M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-40 728H184V184h656v656zM304 288h416v48H304zm0 144h416v48H304zm0 144h416v48H304z"
      />
    </svg>

    <!-- 消息图标 -->
    <svg
      v-else-if="name === 'message'"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      :fill="active ? activeColor : inactiveColor"
    >
      <path
        d="M664 512c0 88.4-93.1 160-208 160S248 600.4 248 512s93.1-160 208-160 208 71.6 208 160zm-416 0c0 61.9 71.5 112 160 112s160-50.1 160-112-71.5-112-160-112-160 50.1-160 112z"
      />
      <path
        d="M925.2 338.4c-22.6-53.7-55-101.9-96.3-143.3a444.35 444.35 0 0 0-143.3-96.3C630.6 75.7 572.2 64 512 64h-2c-60.6.3-119.3 12.3-174.5 35.9a445.35 445.35 0 0 0-142 96.5c-40.9 41.3-73 89.3-95.2 142.8-23 55.4-34.6 114.3-34.3 174.9A449.4 449.4 0 0 0 112 714v152a46 46 0 0 0 46 46h152.1A449.4 449.4 0 0 0 510 960h2.1c59.9 0 118-11.6 172.7-34.3a444.48 444.48 0 0 0 142.8-95.2c41.3-40.9 73.8-88.7 96.5-142 23.6-55.2 35.6-113.9 35.9-174.5.3-60.9-11.5-120-34.8-175.6zm-151.1 438C704 845.8 611 884 512 884h-1.7c-60.3-.3-120.2-15.3-173.1-43.5l-8.4-4.5H188V695.2l-4.5-8.4C155.3 633.9 140.3 574 140 513.7c-.4-99.7 37.7-193.3 107.6-263.8 69.8-70.5 163.1-109.5 262.8-109.9h1.7c50 0 98.5 9.7 144.2 28.9 44.6 18.7 84.6 45.6 119 80 34.3 34.3 61.3 74.4 80 119 19.4 46.2 29.1 95.2 28.9 145.8-.6 99.6-39.7 192.9-110.1 262.7z"
      />
    </svg>

    <!-- 我的图标 -->
    <svg
      v-else-if="name === 'profile'"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      :fill="active ? activeColor : inactiveColor"
    >
      <path
        d="M858.5 763.6a374 374 0 0 0-80.6-119.5 375.63 375.63 0 0 0-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.63 375.63 0 0 0-80.6 119.5A371.7 371.7 0 0 0 136 901.8a8 8 0 0 0 8 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 0 0 8-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"
      />
    </svg>
  </div>
</template>

<script setup>
/**
 * Tabbar 图标组件 Props 类型定义
 * @typedef {Object} Props
 * @property {'home'|'workspace'|'message'|'profile'} name - 图标名称
 * @property {boolean} [active=false] - 是否激活
 * @property {string} [activeColor='#1171F8'] - 激活颜色
 * @property {string} [inactiveColor='#969799'] - 未激活颜色
 */

// 定义组件 Props
const props = defineProps({
  // 图标名称（必填）
  name: {
    type: String,
    required: true,
    // 验证图标名称是否合法
    validator: (value) => ['home', 'workspace', 'message', 'profile'].includes(value)
  },
  // 是否激活状态
  active: {
    type: Boolean,
    default: false
  },
  // 激活时的颜色
  activeColor: {
    type: String,
    default: '#1171F8' // 主题蓝色
  },
  // 未激活时的颜色
  inactiveColor: {
    type: String,
    default: '#969799' // 灰色
  }
})
</script>

<style scoped>
/* 图标容器样式 */
.tabbar-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* SVG 图标样式 */
.tabbar-icon svg {
  width: 100%;
  height: 100%;
  transition: fill 0.3s; /* 颜色过渡动画 */
}
</style>
