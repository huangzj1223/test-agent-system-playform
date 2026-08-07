<template>
  <!-- Hero -->
  <section class="pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 text-center">
      <p class="text-blue-600 text-xs font-semibold mb-3 tracking-widest uppercase">联系我们</p>
      <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">有问题？随时联系我们</h1>
      <p class="text-gray-400 text-base max-w-xl mx-auto">无论是产品咨询、合作意向还是技术支持，我们会在 24 小时内回复</p>
    </div>
  </section>

  <section class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-10">

        <!-- Left: Contact info -->
        <div class="lg:col-span-2 space-y-6">
          <div v-for="info in contactInfo" :key="info.label" class="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-sm transition-all">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="info.iconBg">
              <svg class="w-5 h-5" :class="info.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="info.icon"/>
              </svg>
            </div>
            <div>
              <div class="text-sm font-semibold text-gray-900 mb-0.5">{{ info.label }}</div>
              <div class="text-sm text-gray-400">{{ info.value }}</div>
            </div>
          </div>

          <!-- Response time badge -->
          <div class="p-5 rounded-2xl bg-blue-50 border border-blue-100">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              <span class="text-xs font-semibold text-gray-700">平均响应时间</span>
            </div>
            <div class="text-2xl font-bold text-blue-600">2 小时内</div>
            <div class="text-xs text-gray-400 mt-1">工作日 9:00 - 18:00</div>
          </div>
        </div>

        <!-- Right: Form -->
        <div class="lg:col-span-3">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 class="text-lg font-bold text-gray-900 mb-6">发送消息</h2>

            <form @submit.prevent="handleSubmit" class="space-y-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1.5">姓名 <span class="text-red-400">*</span></label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="请输入您的姓名"
                    class="w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                    :class="errors.name ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
                    @blur="validate('name')"
                  />
                  <p v-if="errors.name" class="text-xs text-red-400 mt-1">{{ errors.name }}</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1.5">邮箱 <span class="text-red-400">*</span></label>
                  <input
                    v-model="form.email"
                    type="email"
                    placeholder="请输入您的邮箱"
                    class="w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                    :class="errors.email ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
                    @blur="validate('email')"
                  />
                  <p v-if="errors.email" class="text-xs text-red-400 mt-1">{{ errors.email }}</p>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1.5">主题 <span class="text-red-400">*</span></label>
                <input
                  v-model="form.subject"
                  type="text"
                  placeholder="请输入主题"
                  class="w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                  :class="errors.subject ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
                  @blur="validate('subject')"
                />
                <p v-if="errors.subject" class="text-xs text-red-400 mt-1">{{ errors.subject }}</p>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1.5">留言内容 <span class="text-red-400">*</span></label>
                <textarea
                  v-model="form.message"
                  rows="5"
                  placeholder="请描述您的问题或需求..."
                  class="w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all resize-none"
                  :class="errors.message ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
                  @blur="validate('message')"
                ></textarea>
                <p v-if="errors.message" class="text-xs text-red-400 mt-1">{{ errors.message }}</p>
              </div>

              <button
                type="submit"
                :disabled="submitting"
                class="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ submitting ? '发送中...' : '发送消息' }}
              </button>

              <p v-if="sent" class="text-center text-sm text-green-600 font-medium">
                ✓ 消息已发送，我们会尽快回复您！
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const submitting = ref(false)
const sent = ref(false)

const form = reactive({ name: '', email: '', subject: '', message: '' })
const errors = reactive({ name: '', email: '', subject: '', message: '' })

function validate(field: keyof typeof form) {
  if (field === 'name') {
    errors.name = form.name.trim() ? '' : '请输入姓名'
  } else if (field === 'email') {
    if (!form.email.trim()) errors.email = '请输入邮箱'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '请输入有效的邮箱地址'
    else errors.email = ''
  } else if (field === 'subject') {
    errors.subject = form.subject.trim() ? '' : '请输入主题'
  } else if (field === 'message') {
    errors.message = form.message.trim() ? '' : '请输入留言内容'
  }
}

async function handleSubmit() {
  ;(['name', 'email', 'subject', 'message'] as const).forEach(validate)
  if (Object.values(errors).some(Boolean)) return
  submitting.value = true
  await new Promise((r) => setTimeout(r, 1000))
  submitting.value = false
  sent.value = true
  Object.assign(form, { name: '', email: '', subject: '', message: '' })
  setTimeout(() => (sent.value = false), 4000)
}

const contactInfo = [
  {
    label: '邮箱',
    value: 'hello@axuremart.ai',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  },
  {
    label: '地址',
    value: '北京市朝阳区望京 SOHO T1',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  },
  {
    label: '工作时间',
    value: '周一至周五 9:00 - 18:00',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
]
</script>
