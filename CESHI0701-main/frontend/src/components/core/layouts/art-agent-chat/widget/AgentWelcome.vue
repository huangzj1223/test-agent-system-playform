<!--
  AG-UI 智能体欢迎页（空状态）
  仅在「当前会话无消息 && 非生成中」时展示，属于 UI 空状态，不写入消息数组。
  点击快捷卡片通过 prompt-click 事件把示例文本回填到输入框（由上层写入草稿）。
-->
<template>
  <div class="agent-welcome">
    <!-- 顶部问候 -->
    <div class="welcome-greeting">
      <h2 class="greet-line">你好！👋</h2>
      <h3 class="greet-line">我是 <span class="brand">{{ agentName }}</span></h3>
    </div>

    <!-- 说明文案 -->
    <p class="welcome-desc">我可以帮你查询数据、分析信息、操作系统，解答你的问题。</p>

    <!-- 机器猫欢迎插画（浅蓝光晕作衬底） -->
    <div class="welcome-illust">
      <img
        :src="welcomeImg"
        alt="智能体欢迎插画"
        class="illust-img"
        width="520"
        height="669"
        loading="eager"
        fetchpriority="high"
      />
    </div>

    <!-- 快捷提示卡片 -->
    <div class="welcome-prompts">
      <button
        v-for="(p, i) in prompts"
        :key="i"
        type="button"
        class="prompt-card"
        @click="onPromptClick(p.text)"
      >
        <span class="card-icon">{{ p.icon }}</span>
        <span class="card-body">
          <span class="card-lead">{{ p.lead }}</span>
          <span class="card-text">“{{ p.text }}”</span>
        </span>
      </button>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import welcomeImg from '@/assets/agent/agent-welcome.png'

  defineOptions({ name: 'AgentWelcome' })

  withDefaults(
    defineProps<{
      /** 智能体名称（主色高亮显示） */
      agentName?: string
    }>(),
    { agentName: 'AG-UI 智能体' }
  )

  const emit = defineEmits<{
    /** 点击快捷卡片：把示例文本回填到输入框 */
    'prompt-click': [text: string]
  }>()

  /** 快捷提示卡片 */
  const prompts = [
    { icon: '💬', lead: '你可以问我：', text: '查询近一个月的物流订单数据' },
    { icon: '📈', lead: '你可以让我：', text: '生成物流趋势分析图表' },
    { icon: '🧭', lead: '你可以操作：', text: '一键导出部门管理报表' }
  ]

  const onPromptClick = (text: string) => emit('prompt-click', text)
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .agent-welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center; // 内容整体纵向居中，面板高时不再上下割裂
    height: 100%;
    padding: 24px 20px;
    overflow-y: auto; // 面板高度不足时欢迎区可滚动，不挤压底部输入框
    text-align: center;
  }

  // 顶部问候
  .welcome-greeting {
    margin-top: 8px;

    .greet-line {
      margin: 0;
      line-height: 1.4;
    }

    .greet-line:first-child {
      font-size: 24px;
      font-weight: 700;
      color: var(--art-text-gray-900, #1f2937);
    }

    .greet-line:last-child {
      font-size: 18px;
      font-weight: 600;
      color: var(--art-text-gray-800, #374151);
    }

    .brand {
      color: rgb(var(--art-primary));
    }
  }

  // 说明文案
  .welcome-desc {
    max-width: 280px;
    margin: 10px 0 4px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--art-text-gray-500, #6b7280);
  }

  // 插画 + 浅蓝光晕衬底
  .welcome-illust {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin: 4px 0 16px;

    // 浅蓝云朵/光晕背景（不喧宾夺主）
    &::before {
      position: absolute;
      bottom: 8%;
      width: 78%;
      height: 60%;
      content: '';
      background: radial-gradient(
        ellipse at center,
        rgba(var(--art-primary), 0.12) 0%,
        rgba(var(--art-primary), 0.04) 55%,
        transparent 75%
      );
      filter: blur(4px);
    }

    .illust-img {
      position: relative;
      width: clamp(180px, 62%, 260px); // 随面板宽度自适应，不撑破
      height: auto;
      object-fit: contain;
      user-select: none;
    }
  }

  // 快捷提示卡片
  .welcome-prompts {
    display: flex;
    flex-direction: column; // 面板窄时仍纵向排列
    gap: 12px;
    width: 100%;
    max-width: 340px;
    margin-top: 4px; // 紧跟插画，避免被底部输入框遮挡

    .prompt-card {
      display: flex;
      gap: 12px;
      align-items: center;
      width: 100%;
      padding: 12px 14px;
      text-align: left;
      cursor: pointer;
      background: var(--art-main-bg-color, #fff);
      border: 1px solid var(--art-border-color, #e5e7eb);
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition:
        border-color 0.2s,
        background-color 0.2s,
        box-shadow 0.2s;

      &:hover {
        background: rgba(var(--art-primary), 0.04);
        border-color: rgb(var(--art-primary));
        box-shadow: 0 2px 8px rgba(var(--art-primary), 0.12);
      }

      .card-icon {
        flex-shrink: 0;
        font-size: 18px;
        line-height: 1;
      }

      .card-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .card-lead {
        font-size: 12px;
        color: var(--art-text-gray-500, #6b7280);
      }

      .card-text {
        overflow: hidden;
        font-size: 13px;
        color: var(--art-text-gray-800, #374151);
        text-overflow: ellipsis;
      }
    }
  }
</style>
