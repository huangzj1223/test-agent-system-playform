<template>
  <!-- Hero -->
  <section class="pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8 text-center">
      <p class="text-blue-600 text-xs font-semibold mb-3 tracking-widest uppercase">产品介绍</p>
      <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">强大的 AI 智能体能力</h1>
      <p class="text-gray-400 text-base max-w-2xl mx-auto">从对话机器人到自动化工作流，AxureMart 提供构建企业级 AI 应用所需的一切</p>
    </div>
  </section>

  <!-- Product 1: 对话机器人 -->
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium mb-5">智能对话</div>
          <h2 class="text-3xl font-bold text-gray-900 mb-4 leading-tight">像真人一样<br />理解你的用户</h2>
          <p class="text-gray-400 text-sm leading-relaxed mb-6">基于最新大语言模型，支持多轮上下文理解、情绪识别和意图分析。机器人能主动引导对话，而不只是被动回答问题。</p>
          <ul class="space-y-3">
            <li v-for="item in chatFeatures" :key="item" class="flex items-start gap-3 text-sm text-gray-600">
              <svg class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              {{ item }}
            </li>
          </ul>
        </div>
        <!-- Chat demo -->
        <div class="bg-gray-50 rounded-2xl border border-gray-100 p-5">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div class="w-2 h-2 rounded-full bg-red-400"></div>
            <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
            <div class="w-2 h-2 rounded-full bg-green-400"></div>
            <span class="text-xs text-gray-400 ml-2">AI 客服助手</span>
          </div>
          <div class="space-y-3">
            <div v-for="msg in chatMessages" :key="msg.id" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
              <div class="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed"
                :class="msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm'">
                {{ msg.text }}
              </div>
            </div>
            <!-- Typing indicator -->
            <div class="flex justify-start">
              <div class="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
                <span class="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style="animation-delay: 300ms"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Product 2: 知识库 -->
  <section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <!-- Knowledge base demo -->
        <div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm order-2 lg:order-1">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <span class="text-xs font-medium text-gray-700">知识库文件</span>
            <span class="text-xs text-blue-600 font-medium">+ 上传文件</span>
          </div>
          <div class="space-y-2">
            <div v-for="file in kbFiles" :key="file.name" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="file.iconBg">
                <svg class="w-4 h-4" :class="file.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-gray-800 truncate">{{ file.name }}</div>
                <div class="text-xs text-gray-400">{{ file.size }} · {{ file.status }}</div>
              </div>
              <div class="w-1.5 h-1.5 rounded-full shrink-0" :class="file.dot"></div>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>共 4 个文件 · 已训练</span>
            <span class="text-green-500 font-medium">● 同步中</span>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-medium mb-5">知识库训练</div>
          <h2 class="text-3xl font-bold text-gray-900 mb-4 leading-tight">上传文档<br />即刻拥有专家级机器人</h2>
          <p class="text-gray-400 text-sm leading-relaxed mb-6">支持 PDF、Word、Excel、网页链接等多种格式。AI 自动解析、分块、向量化，构建高精度检索知识库，回答有据可查。</p>
          <ul class="space-y-3">
            <li v-for="item in kbFeatures" :key="item" class="flex items-start gap-3 text-sm text-gray-600">
              <svg class="w-4 h-4 text-purple-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Product 3: 工作流 -->
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-600 text-xs font-medium mb-5">自动化工作流</div>
          <h2 class="text-3xl font-bold text-gray-900 mb-4 leading-tight">连接你的系统<br />让 AI 自动执行任务</h2>
          <p class="text-gray-400 text-sm leading-relaxed mb-6">通过可视化流程编辑器，将 AI 对话与 CRM、工单、数据库等系统打通。机器人不只是回答，还能直接操作系统完成任务。</p>
          <ul class="space-y-3">
            <li v-for="item in workflowFeatures" :key="item" class="flex items-start gap-3 text-sm text-gray-600">
              <svg class="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
              {{ item }}
            </li>
          </ul>
        </div>
        <!-- Workflow demo -->
        <div class="bg-gray-50 rounded-2xl border border-gray-100 p-5">
          <div class="text-xs text-gray-400 mb-4 font-medium">工作流示例：自动创建工单</div>
          <div class="space-y-2">
            <div v-for="(node, i) in workflowNodes" :key="node.label" class="flex items-center gap-3">
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :class="node.bg">
                  <svg class="w-4 h-4" :class="node.color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="node.icon"/>
                  </svg>
                </div>
                <div v-if="i < workflowNodes.length - 1" class="w-px h-4 bg-gray-200 mt-1"></div>
              </div>
              <div class="flex-1 bg-white rounded-xl border border-gray-100 px-3 py-2.5 shadow-sm">
                <div class="text-xs font-medium text-gray-800">{{ node.label }}</div>
                <div class="text-xs text-gray-400 mt-0.5">{{ node.desc }}</div>
              </div>
              <div class="text-xs font-medium px-2 py-0.5 rounded-full" :class="node.statusClass">{{ node.status }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 bg-blue-600">
    <div class="max-w-2xl mx-auto px-6 text-center">
      <h2 class="text-3xl font-bold text-white mb-3">准备好了吗？</h2>
      <p class="text-blue-200 text-sm mb-8">免费试用 14 天，无需信用卡</p>
      <button class="px-8 py-3 rounded-xl bg-white text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm">
        免费开始使用
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
const chatFeatures = [
  '多轮上下文记忆，理解复杂对话逻辑',
  '支持中英文及方言识别',
  '情绪感知，自动转接人工客服',
  '自定义对话风格和品牌人设',
]

const chatMessages = [
  { id: 1, role: 'user', text: '我的订单什么时候能到？' },
  { id: 2, role: 'bot', text: '您好！请问您的订单号是多少？我来帮您查询最新物流状态。' },
  { id: 3, role: 'user', text: '订单号是 SN20240516001' },
  { id: 4, role: 'bot', text: '查到了！您的订单已于今天 14:30 从上海仓库发出，预计明天下午送达，快递单号：SF1234567890。' },
]

const kbFiles = [
  { name: '产品使用手册 v2.3.pdf', size: '2.4 MB', status: '已训练 · 1,284 段', iconBg: 'bg-red-50', iconColor: 'text-red-500', dot: 'bg-green-400' },
  { name: '常见问题 FAQ.docx', size: '856 KB', status: '已训练 · 342 段', iconBg: 'bg-blue-50', iconColor: 'text-blue-500', dot: 'bg-green-400' },
  { name: '价格政策说明.xlsx', size: '124 KB', status: '已训练 · 89 段', iconBg: 'bg-green-50', iconColor: 'text-green-500', dot: 'bg-green-400' },
  { name: '售后服务流程.pdf', size: '1.1 MB', status: '训练中...', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', dot: 'bg-yellow-400' },
]

const kbFeatures = [
  '支持 PDF、Word、Excel、Markdown、网页链接',
  '自动分块与向量化，检索精准',
  '知识库更新后自动重新训练',
  '引用溯源，回答可追踪来源',
]

const workflowNodes = [
  { label: '触发：用户发送消息', desc: '检测到投诉关键词', bg: 'bg-blue-50', color: 'text-blue-600', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', status: '已触发', statusClass: 'bg-blue-50 text-blue-600' },
  { label: 'AI 分析意图', desc: '识别为：退款投诉，优先级高', bg: 'bg-purple-50', color: 'text-purple-600', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', status: '完成', statusClass: 'bg-purple-50 text-purple-600' },
  { label: '创建工单', desc: '已写入 CRM 系统，工单号 #4521', bg: 'bg-green-50', color: 'text-green-600', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', status: '完成', statusClass: 'bg-green-50 text-green-600' },
  { label: '通知客服主管', desc: '发送飞书消息提醒跟进', bg: 'bg-orange-50', color: 'text-orange-600', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', status: '进行中', statusClass: 'bg-orange-50 text-orange-600' },
]

const workflowFeatures = [
  '可视化拖拽编辑器，无需编写代码',
  '内置 50+ 系统集成（CRM、工单、数据库）',
  '条件分支与循环，处理复杂业务逻辑',
  '执行日志实时追踪，异常自动告警',
]
</script>
