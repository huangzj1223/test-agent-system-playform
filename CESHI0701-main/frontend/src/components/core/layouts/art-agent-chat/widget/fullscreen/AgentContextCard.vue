<!--
  全屏态"当前页面上下文"卡片：读 page-context 快照，展示页面标题/模块/描述。
  查看详情 → 展开结构化上下文；切换上下文 → 提示（当前上下文随业务页面自动切换）。
-->
<template>
  <div class="agent-context-card">
    <div class="card-head">
      <span class="head-label"><i class="iconfont-sys">&#xe763;</i> 当前页面上下文</span>
      <button class="switch-btn" type="button" @click="onSwitch">
        <i class="iconfont-sys">&#xe719;</i> 切换上下文
      </button>
    </div>

    <div v-if="ctx" class="card-body">
      <div class="ctx-main">
        <div class="ctx-icon"><i class="iconfont-sys">&#xe6c5;</i></div>
        <div class="ctx-text">
          <span class="ctx-title">{{ ctx.pageTitle }}</span>
          <span class="ctx-desc">{{ description }}</span>
          <button class="detail-btn" type="button" @click="showDetail = !showDetail">
            查看详情 <i class="iconfont-sys">{{ showDetail ? '&#xe6cd;' : '&#xe644;' }}</i>
          </button>
        </div>
      </div>

      <!-- 结构化上下文明细 -->
      <div v-if="showDetail" class="ctx-detail">
        <div class="detail-row"><span class="k">模块</span><span class="v">{{ ctx.module }}</span></div>
        <div class="detail-row"><span class="k">路由</span><span class="v">{{ ctx.route }}</span></div>
        <div class="detail-row">
          <span class="k">可用操作</span><span class="v">{{ ctx.availableActions.length }} 项</span>
        </div>
        <div class="detail-row">
          <span class="k">数据行</span><span class="v">{{ ctx.pagination.total }} 条</span>
        </div>
        <div v-if="ctx.visibleColumns.length" class="detail-row">
          <span class="k">可见列</span>
          <span class="v">{{ ctx.visibleColumns.map((c) => c.title).join('、') }}</span>
        </div>
      </div>
    </div>

    <!-- 无上下文兜底 -->
    <div v-else class="card-empty">
      <i class="iconfont-sys">&#xe816;</i>
      <span>当前页面未提供上下文，你仍可直接向智能体提问</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { getPageContext } from '@/agent/page-context'

  defineOptions({ name: 'AgentContextCard' })

  /** 是否展开详情 */
  const showDetail = ref(false)

  /** 页面上下文快照（进入全屏时读取一次；随属性访问保持即时） */
  const ctx = computed(() => getPageContext())

  /** 页面描述：优先取可见列拼描述，兜底通用语 */
  const description = computed(() => {
    const c = ctx.value
    if (!c) return ''
    const cols = c.visibleColumns.map((x) => x.title).slice(0, 4).join('、')
    return cols ? `查看与管理${c.pageTitle}信息，含 ${cols} 等` : `查看与管理${c.pageTitle}相关信息`
  })

  /** 切换上下文：当前上下文随业务页面自动切换，这里给出说明提示 */
  const onSwitch = () => {
    ElMessage.info('当前上下文会随你所在的业务页面自动切换')
  }
</script>

<style lang="scss" scoped>
  .agent-context-card {
    width: 100%;
    padding: 16px 20px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 14px;

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;

      .head-label {
        display: flex;
        gap: 6px;
        align-items: center;
        font-size: 13px;
        color: var(--art-text-gray-600);

        i {
          color: var(--art-primary);
        }
      }

      .switch-btn {
        display: flex;
        gap: 4px;
        align-items: center;
        font-size: 13px;
        color: var(--art-primary);
        cursor: pointer;
        background: transparent;
        border: none;

        &:hover {
          opacity: 0.8;
        }
      }
    }

    .card-body {
      .ctx-main {
        display: flex;
        gap: 14px;
        align-items: flex-start;
      }

      .ctx-icon {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 72px;
        height: 56px;
        font-size: 24px;
        color: var(--art-primary);
        background: var(--art-primary-light-9, var(--art-gray-100));
        border-radius: 10px;
      }

      .ctx-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;

        .ctx-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--art-text-gray-900);
        }

        .ctx-desc {
          font-size: 13px;
          color: var(--art-text-gray-500);
        }

        .detail-btn {
          display: flex;
          gap: 4px;
          align-items: center;
          align-self: flex-start;
          margin-top: 2px;
          font-size: 13px;
          color: var(--art-primary);
          cursor: pointer;
          background: transparent;
          border: none;

          &:hover {
            opacity: 0.8;
          }
        }
      }

      .ctx-detail {
        padding-top: 14px;
        margin-top: 14px;
        border-top: 1px dashed var(--art-border-color);

        .detail-row {
          display: flex;
          gap: 12px;
          padding: 4px 0;
          font-size: 13px;

          .k {
            flex-shrink: 0;
            width: 64px;
            color: var(--art-text-gray-500);
          }

          .v {
            color: var(--art-text-gray-800);
          }
        }
      }
    }

    .card-empty {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: center;
      padding: 20px 0;
      font-size: 13px;
      color: var(--art-text-gray-400);

      i {
        font-size: 20px;
      }
    }
  }
</style>
