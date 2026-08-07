<!--
  全屏态快捷操作卡片行：由当前页面上下文（page-context.availableActions）动态生成。
  点击卡片把一句自然语言提示填入输入框（走真实 agent），不直接执行高风险操作。
  无页面上下文时显示"探索全部功能"兜底卡。
-->
<template>
  <div class="agent-quick-actions">
    <button
      v-for="card in cards"
      :key="card.key"
      class="quick-card"
      type="button"
      @click="emit('pick', card.prompt)"
    >
      <i class="iconfont-sys card-icon" v-html="card.icon"></i>
      <div class="card-text">
        <span class="card-title">{{ card.title }}</span>
        <span class="card-desc">{{ card.desc }}</span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { getPageContext } from '@/agent/page-context'
  import { getAction } from '@/agent/frontend-action-registry'

  defineOptions({ name: 'AgentQuickActions' })

  const emit = defineEmits<{
    /** 选中某快捷操作：把提示词填入输入框 */
    pick: [prompt: string]
  }>()

  interface QuickCard {
    key: string
    title: string
    desc: string
    icon: string
    prompt: string
  }

  /**
   * 优先展示的操作及其展示元数据（图标/短标题）。key 为 action 名。
   * 只挑"发起类"操作做卡片，避免把 ui.search 等低层操作暴露给用户。
   */
  const CARD_META: Record<string, { title: string; icon: string }> = {
    'department.openCreateDialog': { title: '新增部门', icon: '&#xe6b1;' },
    'department.create': { title: '新增部门', icon: '&#xe6b1;' },
    'ui.setFilters': { title: '调整筛选', icon: '&#xe719;' },
    'ui.refresh': { title: '刷新数据', icon: '&#xe70d;' },
    'position.openCreateDialog': { title: '新增岗位', icon: '&#xe6b1;' },
    'user.openCreateDialog': { title: '新增用户', icon: '&#xe6b1;' },
    'menu.openCreateDialog': { title: '新增菜单', icon: '&#xe6b1;' },
    'role.openCreateDialog': { title: '新增角色', icon: '&#xe6b1;' }
  }

  /** 兜底卡：无上下文或无可映射操作时展示 */
  const FALLBACK_CARD: QuickCard = {
    key: '__explore__',
    title: '探索全部功能',
    desc: '看看智能体能帮你做什么',
    icon: '&#xe712;',
    prompt: '你能帮我做哪些事情？'
  }

  /** "更多能力"卡：始终附在末尾 */
  const MORE_CARD: QuickCard = {
    key: '__more__',
    title: '更多能力',
    desc: '探索全部功能',
    icon: '&#xe6df;',
    prompt: '基于当前页面，你还能帮我做哪些操作？'
  }

  /** 动态卡片：读页面上下文的 availableActions，映射为发起类卡片 */
  const cards = computed<QuickCard[]>(() => {
    const ctx = getPageContext()
    if (!ctx) return [FALLBACK_CARD]

    const page = ctx.pageTitle || '当前页面'
    const seen = new Set<string>()
    const list: QuickCard[] = []

    for (const name of ctx.availableActions) {
      const meta = CARD_META[name]
      if (!meta || seen.has(meta.title)) continue
      seen.add(meta.title)
      const action = getAction(name)
      list.push({
        key: name,
        title: meta.title,
        desc: action?.description?.slice(0, 20) || `在${page}执行此操作`,
        icon: meta.icon,
        prompt: `请帮我${meta.title}`
      })
      if (list.length >= 4) break
    }

    if (!list.length) return [FALLBACK_CARD, MORE_CARD]
    list.push(MORE_CARD)
    return list
  })
</script>

<style lang="scss" scoped>
  .agent-quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    width: 100%;

    .quick-card {
      display: flex;
      gap: 10px;
      align-items: center;
      min-width: 180px;
      max-width: 220px;
      padding: 14px 16px;
      text-align: left;
      cursor: pointer;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 12px;
      transition:
        border-color 0.2s,
        box-shadow 0.2s,
        transform 0.2s;

      &:hover {
        border-color: var(--art-primary);
        box-shadow: var(--art-box-shadow-sm, 0 4px 12px rgb(0 0 0 / 8%));
        transform: translateY(-2px);
      }

      .card-icon {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        font-size: 18px;
        color: var(--art-primary);
        background: var(--art-primary-light-9, var(--art-gray-100));
        border-radius: 8px;
      }

      .card-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;

        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--art-text-gray-900);
        }

        .card-desc {
          overflow: hidden;
          font-size: 12px;
          color: var(--art-text-gray-500);
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
</style>
