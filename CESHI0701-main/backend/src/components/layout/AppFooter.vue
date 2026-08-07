<template>
  <footer class="bg-gray-900 text-gray-400">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 py-14">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-10">
        <!-- Brand -->
        <div class="md:col-span-2">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">A</div>
            <span class="font-bold text-lg text-white">AxureMart</span>
          </div>
          <p class="text-sm leading-relaxed max-w-xs text-gray-500">
            新一代 AI 智能体平台，帮助企业快速构建和部署专属 AI 机器人。
          </p>
          <div class="flex gap-3 mt-6">
            <a v-for="social in socials" :key="social.name" href="#"
              class="w-8 h-8 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500 hover:text-white hover:border-gray-500 transition-all">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" v-html="social.svg"></svg>
            </a>
          </div>
        </div>

        <!-- Links -->
        <div v-for="group in linkGroups" :key="group.title">
          <h4 class="text-white font-medium mb-4 text-sm">{{ group.title }}</h4>
          <ul class="space-y-2.5">
            <li v-for="link in group.links" :key="link.label">
              <a href="#" class="text-gray-500 hover:text-gray-300 transition-colors text-sm">{{ link.label }}</a>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
        <p>© 2026 AxureMart. All rights reserved.</p>
        <div class="flex gap-6">
          <a href="#" class="hover:text-gray-400 transition-colors">隐私政策</a>
          <a href="#" class="hover:text-gray-400 transition-colors">服务条款</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const socials = [
  {
    name: 'Twitter/X',
    svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  },
  {
    name: 'WeChat',
    svg: '<path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-3.898-6.348-7.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-3.518 3.274c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.543.434-.983.969-.983zm4.703 0c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.543.434-.983.969-.983z"/>',
  },
  {
    name: 'GitHub',
    svg: '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
  },
]

const linkGroups = [
  {
    title: '产品',
    links: [
      { label: '智能客服' },
      { label: '销售助手' },
      { label: '数据分析' },
      { label: 'API 文档' },
    ],
  },
  {
    title: '公司',
    links: [
      { label: '关于我们' },
      { label: '联系我们' },
      { label: '博客' },
      { label: '招聘' },
    ],
  },
]
</script>
