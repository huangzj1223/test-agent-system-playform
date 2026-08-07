<template>
  <section class="pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 text-center">
      <p class="text-blue-600 text-xs font-semibold mb-3 tracking-widest uppercase">关于我们</p>
      <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">我们的使命</h1>
      <p class="text-gray-400 text-base max-w-xl mx-auto">让每一家企业都能轻松拥有专属 AI 智能体，无需技术门槛</p>
    </div>
  </section>

  <!-- Mission -->
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-4">为什么我们要做这件事</h2>
          <p class="text-gray-400 text-sm leading-relaxed mb-4">
            AxureMart 成立于 2023 年。我们发现，大多数企业都知道 AI 能提升效率，但真正落地却困难重重——需要大量工程师、漫长的开发周期、高昂的维护成本。
          </p>
          <p class="text-gray-400 text-sm leading-relaxed mb-4">
            我们相信，AI 智能体应该像搭积木一样简单。任何人，不需要写一行代码，就能在几分钟内部署一个真正有用的 AI 机器人。
          </p>
          <p class="text-gray-400 text-sm leading-relaxed">
            这就是 AxureMart 存在的意义。
          </p>
        </div>
        <!-- Illustration: SVG rocket scene -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl h-72 flex items-center justify-center relative overflow-hidden">
          <svg viewBox="0 0 280 220" class="w-64 h-52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Stars -->
            <circle cx="30" cy="30" r="2" fill="#bfdbfe"/>
            <circle cx="240" cy="20" r="1.5" fill="#bfdbfe"/>
            <circle cx="200" cy="60" r="2" fill="#c7d2fe"/>
            <circle cx="60" cy="80" r="1.5" fill="#bfdbfe"/>
            <circle cx="250" cy="100" r="2" fill="#bfdbfe"/>
            <!-- Rocket body -->
            <ellipse cx="140" cy="100" rx="22" ry="50" fill="#2563eb"/>
            <!-- Rocket nose -->
            <path d="M118 70 Q140 20 162 70Z" fill="#1d4ed8"/>
            <!-- Window -->
            <circle cx="140" cy="90" r="10" fill="white" opacity="0.9"/>
            <circle cx="140" cy="90" r="6" fill="#93c5fd"/>
            <!-- Fins left -->
            <path d="M118 130 L100 160 L118 150Z" fill="#1d4ed8"/>
            <!-- Fins right -->
            <path d="M162 130 L180 160 L162 150Z" fill="#1d4ed8"/>
            <!-- Flame outer -->
            <ellipse cx="140" cy="158" rx="14" ry="20" fill="#fbbf24" opacity="0.8"/>
            <!-- Flame inner -->
            <ellipse cx="140" cy="162" rx="8" ry="14" fill="#f97316" opacity="0.9"/>
            <!-- Flame core -->
            <ellipse cx="140" cy="166" rx="4" ry="8" fill="#fef3c7"/>
            <!-- Smoke particles -->
            <circle cx="125" cy="175" r="5" fill="#e2e8f0" opacity="0.6"/>
            <circle cx="155" cy="178" r="4" fill="#e2e8f0" opacity="0.5"/>
            <circle cx="138" cy="185" r="6" fill="#e2e8f0" opacity="0.4"/>
            <!-- Ground dots -->
            <circle cx="80" cy="200" r="3" fill="#bfdbfe"/>
            <circle cx="140" cy="205" r="4" fill="#bfdbfe"/>
            <circle cx="200" cy="200" r="3" fill="#bfdbfe"/>
          </svg>
        </div>
      </div>
    </div>
  </section>

  <!-- Values -->
  <section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-3">我们的价值观</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="value in values" :key="value.title" class="bg-white rounded-2xl border border-gray-100 p-6">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" :class="value.iconBg">
            <svg class="w-5 h-5" :class="value.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="value.icon"/>
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-gray-900 mb-2">{{ value.title }}</h3>
          <p class="text-gray-400 text-sm leading-relaxed">{{ value.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Team -->
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-3">核心团队</h2>
        <p class="text-gray-400 text-sm">来自顶尖科技公司的工程师和产品人</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="member in team" :key="member.name" class="text-center p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
          <!-- Avatar with SVG illustration -->
          <div class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold" :class="member.avatarColor">
            {{ member.name[0] }}
          </div>
          <h3 class="text-sm font-semibold text-gray-900">{{ member.name }}</h3>
          <p class="text-xs text-gray-400 mt-1">{{ member.role }}</p>
          <p class="text-xs text-gray-300 mt-1">{{ member.prev }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Join us -->
  <section class="py-20 bg-blue-600">
    <div class="max-w-2xl mx-auto px-6 text-center">
      <h2 class="text-2xl font-bold text-white mb-3">加入我们</h2>
      <p class="text-blue-200 text-sm mb-8">我们正在寻找对 AI 充满热情的工程师、设计师和产品人</p>
      <button class="px-8 py-3 rounded-xl bg-white text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors">
        查看开放职位
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
const values = [
  {
    title: '简单优先',
    desc: '复杂的技术应该被隐藏在简单的界面背后。我们始终以最终用户的使用体验为第一优先级。',
    iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  },
  {
    title: '客户成功',
    desc: '我们的成功建立在客户的成功之上。每一个功能决策都以「这能帮助客户解决真实问题吗」为标准。',
    iconBg: 'bg-green-50', iconColor: 'text-green-600',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    title: '持续进化',
    desc: 'AI 技术日新月异，我们保持快速迭代，确保客户始终使用到最先进的 AI 能力。',
    iconBg: 'bg-purple-50', iconColor: 'text-purple-600',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  },
]

const team = [
  { name: '张明', role: '创始人 & CEO', prev: '前百度 AI 部门', avatarColor: 'bg-blue-500' },
  { name: '李华', role: '产品负责人', prev: '前腾讯产品总监', avatarColor: 'bg-indigo-500' },
  { name: '王芳', role: '技术负责人', prev: '前阿里云架构师', avatarColor: 'bg-cyan-500' },
  { name: '陈磊', role: '设计负责人', prev: '前字节跳动设计师', avatarColor: 'bg-violet-500' },
]
</script>
