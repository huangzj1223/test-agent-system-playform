<template>
  <!-- Hero -->
  <section class="pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 text-center">
      <p class="text-blue-600 text-xs font-semibold mb-3 tracking-widest uppercase">定价方案</p>
      <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">简单透明的定价</h1>
      <p class="text-gray-400 text-base max-w-xl mx-auto mb-8">按需选择，随时升级或降级，无隐藏费用</p>
      <!-- Toggle -->
      <div class="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        <button
          class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
          :class="annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
          @click="annual = true"
        >按年付费</button>
        <button
          class="px-5 py-2 rounded-lg text-sm font-medium transition-all"
          :class="!annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'"
          @click="annual = false"
        >按月付费</button>
      </div>
      <div v-if="annual" class="mt-2 text-xs text-green-600 font-medium">按年付费节省 20%</div>
    </div>
  </section>

  <!-- Plans -->
  <section class="pb-24 bg-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="rounded-2xl border p-7 flex flex-col relative"
          :class="plan.featured ? 'border-blue-500 shadow-xl shadow-blue-100' : 'border-gray-100'"
        >
          <div v-if="plan.featured" class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
            最受欢迎
          </div>
          <div class="mb-5">
            <h3 class="text-base font-bold text-gray-900 mb-1">{{ plan.name }}</h3>
            <p class="text-gray-400 text-xs">{{ plan.desc }}</p>
          </div>
          <div class="mb-6">
            <div class="flex items-end gap-1">
              <span class="text-4xl font-bold text-gray-900">¥{{ annual ? plan.annualPrice : plan.monthlyPrice }}</span>
              <span class="text-gray-400 text-sm mb-1">/月</span>
            </div>
            <div v-if="annual && plan.annualPrice > 0" class="text-xs text-gray-400 mt-1">按年付 ¥{{ plan.annualPrice * 12 }} 元</div>
          </div>
          <button
            class="w-full py-2.5 rounded-xl text-sm font-medium mb-6 transition-colors"
            :class="plan.featured ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'"
          >
            {{ plan.cta }}
          </button>
          <ul class="space-y-3 flex-1">
            <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2.5 text-sm text-gray-600">
              <svg class="w-4 h-4 mt-0.5 shrink-0" :class="plan.featured ? 'text-blue-500' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              {{ feature }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Enterprise -->
      <div class="max-w-5xl mx-auto mt-6">
        <div class="rounded-2xl border border-gray-100 p-7 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 class="text-base font-bold text-gray-900 mb-1">企业版</h3>
            <p class="text-gray-400 text-sm">私有化部署、定制开发、专属客户成功团队，适合大型企业和特殊合规需求</p>
          </div>
          <button class="px-7 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap shrink-0">
            联系销售
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="py-20 bg-gray-50">
    <div class="max-w-3xl mx-auto px-6 lg:px-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-10 text-center">常见问题</h2>
      <div class="space-y-3">
        <div
          v-for="faq in faqs"
          :key="faq.q"
          class="bg-white rounded-xl border border-gray-100 overflow-hidden"
        >
          <button
            class="w-full flex items-center justify-between px-5 py-4 text-left"
            @click="faq.open = !faq.open"
          >
            <span class="text-sm font-medium text-gray-900">{{ faq.q }}</span>
            <svg class="w-4 h-4 text-gray-400 shrink-0 transition-transform" :class="faq.open ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div v-if="faq.open" class="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-gray-50">
            {{ faq.a }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const annual = ref(true)

const plans = [
  {
    name: '免费版',
    desc: '个人探索和小型项目',
    annualPrice: 0,
    monthlyPrice: 0,
    cta: '免费开始',
    featured: false,
    features: [
      '1 个 AI 机器人',
      '每月 500 条对话',
      '5 MB 知识库存储',
      '基础对话分析',
      '社区支持',
    ],
  },
  {
    name: '专业版',
    desc: '成长型团队和中小企业',
    annualPrice: 199,
    monthlyPrice: 249,
    cta: '免费试用 14 天',
    featured: true,
    features: [
      '10 个 AI 机器人',
      '每月 20,000 条对话',
      '5 GB 知识库存储',
      '自动化工作流',
      '多渠道接入',
      '高级数据分析',
      '邮件 + 在线支持',
    ],
  },
  {
    name: '商业版',
    desc: '大型团队和高并发场景',
    annualPrice: 599,
    monthlyPrice: 749,
    cta: '免费试用 14 天',
    featured: false,
    features: [
      '无限 AI 机器人',
      '每月 200,000 条对话',
      '50 GB 知识库存储',
      '高级工作流 + API',
      '自定义模型微调',
      'SLA 99.9% 保障',
      '专属客户成功经理',
    ],
  },
]

const faqs = reactive([
  { q: '免费试用期结束后会自动扣费吗？', a: '不会。试用期结束后如果不主动升级，账号会自动降级为免费版，不会产生任何费用。', open: false },
  { q: '对话数量超出套餐限制怎么办？', a: '超出后机器人会暂停响应，您可以随时升级套餐或购买额外对话包，不会影响已有数据。', open: false },
  { q: '知识库支持哪些文件格式？', a: '支持 PDF、Word（.docx）、Excel（.xlsx）、Markdown、TXT 以及网页 URL。单文件最大 50 MB。', open: false },
  { q: '数据安全如何保障？', a: '所有数据传输使用 TLS 1.3 加密，存储使用 AES-256 加密。商业版和企业版支持数据隔离和私有化部署。', open: false },
  { q: '可以随时取消订阅吗？', a: '可以，随时取消，当前计费周期结束前仍可正常使用。按年付费取消后不退还剩余费用。', open: false },
])
</script>
