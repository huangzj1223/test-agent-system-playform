<!-- 历史会话抽屉：列出已保存会话，点击切换，可删除 -->
<template>
  <el-drawer
    :model-value="visible"
    title="历史会话"
    size="320px"
    direction="rtl"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
  >
    <div v-if="!sessions.length" class="history-empty">
      <el-empty description="暂无历史会话" :image-size="60" />
    </div>
    <ul v-else class="history-list">
      <li
        v-for="s in sessions"
        :key="s.threadId"
        class="history-item"
        :class="{ 'is-active': s.threadId === currentThreadId }"
        @click="onPick(s.threadId)"
      >
        <div class="item-main">
          <div class="item-title">{{ s.title }}</div>
          <div class="item-meta">{{ formatTime(s.updatedAt) }} · {{ s.messageCount }} 条</div>
        </div>
        <button
          class="item-del"
          type="button"
          aria-label="删除会话"
          @click.stop="onDelete(s.threadId)"
        >
          <el-icon :size="14"><Delete /></el-icon>
        </button>
      </li>
    </ul>
  </el-drawer>
</template>

<script setup lang="ts">
  import { Delete } from '@element-plus/icons-vue'
  import type { ConversationMeta } from '@/api/agentConversation'

  defineOptions({ name: 'AgentHistoryDrawer' })

  defineProps<{
    /** 抽屉可见性 */
    visible: boolean
    /** 会话元数据列表（已按更新时间倒序） */
    sessions: ConversationMeta[]
    /** 当前会话线程 ID（高亮） */
    currentThreadId: string
  }>()

  const emit = defineEmits<{
    'update:visible': [v: boolean]
    /** 选择会话 */
    pick: [threadId: string]
    /** 删除会话 */
    remove: [threadId: string]
  }>()

  /** 选择会话后关闭抽屉 */
  const onPick = (threadId: string) => {
    emit('pick', threadId)
    emit('update:visible', false)
  }

  /** 删除会话 */
  const onDelete = (threadId: string) => emit('remove', threadId)

  /** 友好时间：今天显示时分，否则显示月日 */
  const formatTime = (ts: number): string => {
    const d = new Date(ts)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    const pad = (n: number) => String(n).padStart(2, '0')
    return sameDay
      ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
      : `${d.getMonth() + 1}月${d.getDate()}日`
  }
</script>

<style lang="scss" scoped>
  .history-empty {
    padding-top: 40px;
  }

  .history-list {
    padding: 0;
    margin: 0;
    list-style: none;

    .history-item {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.2s;

      &:hover {
        background: var(--art-gray-100);

        .item-del {
          opacity: 1;
        }
      }

      &.is-active {
        background: rgba(var(--art-primary), 0.1);
      }

      .item-main {
        flex: 1;
        min-width: 0;
      }

      .item-title {
        overflow: hidden;
        font-size: 13px;
        color: var(--art-text-gray-900);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-meta {
        margin-top: 3px;
        font-size: 11px;
        color: var(--art-text-gray-400);
      }

      .item-del {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: var(--art-text-gray-400);
        cursor: pointer;
        background: transparent;
        border: none;
        border-radius: 6px;
        opacity: 0;
        transition: opacity 0.2s;

        &:hover {
          color: rgb(var(--art-danger));
          background: var(--art-main-bg-color);
        }
      }
    }
  }
</style>
