<template>
  <!-- Hero -->
  <section class="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white pt-24 pb-20">
    <div class="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>

    <div class="relative max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        <!-- Left -->
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-6">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
            新一代 AI 智能体平台
          </div>
          <h1 class="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            部署你的<br />
            <span class="text-blue-600">AI 智能体</span><br />
            只需几分钟
          </h1>
          <p class="text-base text-gray-500 leading-relaxed mb-8">
            AxureMart 让你无需编写代码，即可构建、训练和部署专属 AI 机器人。自动处理客服、销售、数据分析等各类业务场景。
          </p>
          <div class="flex flex-wrap gap-3">
            <button class="px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              免费创建智能体
            </button>
            <button class="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
              <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
              </svg>
              观看演示
            </button>
          </div>

          <div class="flex items-center gap-8 mt-10 pt-8 border-t border-gray-100">
            <div v-for="stat in heroStats" :key="stat.label">
              <div class="text-2xl font-bold text-gray-900">{{ stat.value }}</div>
              <div class="text-xs text-gray-400 mt-0.5">{{ stat.label }}</div>
            </div>
          </div>
        </div>

        <!-- Right: Robot -->
        <div class="flex justify-center lg:justify-end">
          <div class="relative w-72 h-72 lg:w-80 lg:h-80">
            <div class="absolute inset-0 rounded-full border-2 border-dashed border-blue-100 animate-spin" style="animation-duration: 20s;"></div>
            <div class="absolute inset-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50"></div>

            <!-- Robot -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="flex flex-col items-center gap-2">
                <!-- Head -->
                <div class="w-24 h-20 bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center justify-center gap-2 relative">
                  <div class="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow shadow-blue-300"></div>
                    <div class="w-px h-3.5 bg-gray-200"></div>
                  </div>
                  <div class="flex gap-3">
                    <div class="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center">
                      <div class="w-1 h-1 rounded-full bg-white"></div>
                    </div>
                    <div class="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center">
                      <div class="w-1 h-1 rounded-full bg-white"></div>
                    </div>
                  </div>
                  <div class="w-8 h-1.5 rounded-full bg-gray-100 flex items-center justify-center gap-1">
                    <div class="w-1 h-1 rounded-full bg-blue-300"></div>
                    <div class="w-1 h-1 rounded-full bg-blue-400"></div>
                    <div class="w-1 h-1 rounded-full bg-blue-300"></div>
                  </div>
                </div>
                <!-- Body -->
                <div class="w-28 h-18 bg-white rounded-2xl shadow-md border border-gray-100 flex items-center justify-center p-3">
                  <div class="grid grid-cols-3 gap-1">
                    <div v-for="i in 9" :key="i" class="w-2 h-2 rounded-sm" :class="[i === 2 || i === 5 || i === 8 ? 'bg-blue-500' : i % 2 === 0 ? 'bg-blue-200' : 'bg-gray-100']"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Floating cards -->
            <div class="absolute top-4 -left-6 bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2 flex items-center gap-2 whitespace-nowrap">
              <div class="w-5 h-5 rounded-md bg-green-100 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span class="text-xs font-medium text-gray-700">已处理 1,284 条</span>
            </div>
            <div class="absolute bottom-8 -right-6 bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2 flex items-center gap-2 whitespace-nowrap">
              <div class="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                <svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <span class="text-xs font-medium text-gray-700">响应 &lt; 0.3s</span>
            </div>
            <div class="absolute top-1/2 -translate-y-1/2 -right-10 bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2 text-center">
              <div class="text-xs text-gray-400">准确率</div>
              <div class="text-base font-bold text-blue-600 leading-tight">98.6%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Logos -->
  <section class="py-10 border-y border-gray-100">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <p class="text-center text-gray-400 text-xs mb-6 tracking-widest uppercase">已为以下企业提供服务</p>
      <div class="flex flex-wrap justify-center items-center gap-10">
        <span v-for="brand in brands" :key="brand" class="text-gray-300 font-semibold text-base tracking-wide">{{ brand }}</span>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="py-24 bg-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="text-center mb-14">
        <p class="text-blue-600 text-xs font-semibold mb-3 tracking-widest uppercase">核心能力</p>
        <h2 class="text-3xl font-bold text-gray-900 mb-3">一个平台，覆盖所有 AI 场景</h2>
        <p class="text-gray-400 text-sm max-w-xl mx-auto">无论是客服机器人、销售助手还是数据分析，AxureMart 都能快速搭建</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="p-6 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-200"
        >
          <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" :class="feature.iconBg">
            <component :is="feature.icon" class="w-5 h-5" :class="feature.iconColor" />
          </div>
          <h3 class="text-sm font-semibold text-gray-900 mb-2">{{ feature.title }}</h3>
          <p class="text-gray-400 text-sm leading-relaxed">{{ feature.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section class="py-24 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="text-center mb-14">
        <p class="text-blue-600 text-xs font-semibold mb-3 tracking-widest uppercase">使用流程</p>
        <h2 class="text-3xl font-bold text-gray-900 mb-3">三步上线你的 AI 机器人</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div v-for="(step, i) in steps" :key="step.title" class="text-center">
          <div class="w-14 h-14 rounded-2xl bg-white border-2 border-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 mx-auto mb-5 shadow-sm">
            {{ i + 1 }}
          </div>
          <h3 class="text-sm font-semibold text-gray-900 mb-2">{{ step.title }}</h3>
          <p class="text-gray-400 text-sm leading-relaxed">{{ step.desc }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="py-16 bg-blue-600">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
        <div v-for="stat in stats" :key="stat.label">
          <div class="text-3xl font-bold mb-1">{{ stat.value }}</div>
          <div class="text-blue-200 text-sm">{{ stat.label }}</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section class="py-24 bg-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="text-center mb-14">
        <p class="text-blue-600 text-xs font-semibold mb-3 tracking-widest uppercase">用户评价</p>
        <h2 class="text-3xl font-bold text-gray-900 mb-3">他们都在用 AxureMart</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="review in reviews" :key="review.name" class="p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
          <div class="flex text-yellow-400 mb-4 gap-0.5">
            <svg v-for="i in 5" :key="i" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
          <p class="text-gray-600 text-sm leading-relaxed mb-5">"{{ review.content }}"</p>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" :class="review.avatarColor">{{ review.name[0] }}</div>
            <div>
              <div class="text-gray-900 text-sm font-medium">{{ review.name }}</div>
              <div class="text-gray-400 text-xs">{{ review.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-24 bg-gray-50">
    <div class="max-w-2xl mx-auto px-6 text-center">
      <h2 class="text-3xl font-bold text-gray-900 mb-3">立即部署你的第一个 AI 机器人</h2>
      <p class="text-gray-400 text-sm mb-8">免费试用 14 天，无需信用卡，5 分钟完成配置</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button class="px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          免费开始使用
        </button>
        <button class="px-8 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-white transition-colors">
          联系销售团队
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { defineComponent, h } from 'vue'

// SVG icon components
const IconRobot = defineComponent({
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.5', d: 'M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2M9 3a2 2 0 002 2h2a2 2 0 002-2M9 3a2 2 0 012-2h2a2 2 0 012 2' }),
    h('circle', { cx: '9', cy: '12', r: '1', fill: 'currentColor', stroke: 'none' }),
    h('circle', { cx: '15', cy: '12', r: '1', fill: 'currentColor', stroke: 'none' }),
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.5', d: 'M9 16h6' }),
  ]),
})

const IconBrain = defineComponent({
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.5', d: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' }),
  ]),
})

const IconZap = defineComponent({
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.5', d: 'M13 10V3L4 14h7v7l9-11h-7z' }),
  ]),
})

const IconChart = defineComponent({
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.5', d: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' }),
  ]),
})

const IconPlug = defineComponent({
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.5', d: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244' }),
  ]),
})

const IconShield = defineComponent({
  render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '1.5', d: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' }),
  ]),
})

const heroStats = [
  { value: '50K+', label: '活跃机器人' },
  { value: '98.6%', label: '响应准确率' },
  { value: '< 0.3s', label: '平均响应时间' },
]

const brands = ['腾讯', '美团', '京东', '网易', '滴滴', '小米']

const features = [
  { icon: IconRobot, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', title: '智能对话机器人', desc: '基于大语言模型，理解上下文语义，提供自然流畅的多轮对话体验，支持中英文切换。' },
  { icon: IconBrain, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', title: '知识库训练', desc: '上传文档、网页或 FAQ，AI 自动学习并构建专属知识库，回答精准有据可查。' },
  { icon: IconZap, iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600', title: '自动化工作流', desc: '连接 CRM、工单系统、数据库，机器人自动执行任务，无需人工介入。' },
  { icon: IconChart, iconBg: 'bg-green-50', iconColor: 'text-green-600', title: '数据分析助手', desc: '用自然语言查询数据，AI 自动生成图表和报告，让数据分析不再需要 SQL。' },
  { icon: IconPlug, iconBg: 'bg-orange-50', iconColor: 'text-orange-600', title: '多渠道接入', desc: '一键接入网站、微信、钉钉、飞书等平台，统一管理所有渠道的对话。' },
  { icon: IconShield, iconBg: 'bg-red-50', iconColor: 'text-red-600', title: '安全与合规', desc: '数据本地化部署可选，内容安全过滤，满足金融、医疗等行业合规要求。' },
]

const steps = [
  { title: '配置你的机器人', desc: '选择场景模板，上传知识库，设置对话风格，10 分钟完成初始配置。' },
  { title: '训练与测试', desc: '在沙盒环境中测试对话效果，持续优化回答质量，直到满意为止。' },
  { title: '一键部署上线', desc: '生成嵌入代码或 API，接入任意平台，实时监控运行状态。' },
]

const stats = [
  { value: '50,000+', label: '部署机器人数' },
  { value: '2亿+', label: '处理对话数' },
  { value: '98.6%', label: '用户满意度' },
  { value: '< 0.3s', label: '平均响应时间' },
]

const reviews = [
  { name: '陈总', role: '电商平台 · 客服负责人', avatarColor: 'bg-blue-500', content: '接入 AxureMart 后，客服机器人处理了 80% 的常见问题，人工客服工作量减少了一半，客户满意度反而提升了。' },
  { name: '刘工', role: '金融科技公司 · 技术总监', avatarColor: 'bg-indigo-500', content: '知识库训练非常方便，把我们的产品手册上传进去，机器人就能准确回答各种专业问题，比自己训练省了大量时间。' },
  { name: '王总', role: 'SaaS 创业公司 · CEO', avatarColor: 'bg-cyan-500', content: '5 分钟就部署好了，接入飞书后销售团队的询盘响应速度从几小时缩短到秒级，转化率明显提升。' },
]
</script>
