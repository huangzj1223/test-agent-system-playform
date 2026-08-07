<!-- 模型配置管理 - 右侧已添加模型列表 -->
<template>
  <div class="model-list">
    <div class="list-head">
      <div class="head-text">
        <h4 class="section-title">已添加模型</h4>
        <p class="section-desc">聊天页面的模型选择器将读取这里已启用的模型。</p>
      </div>
      <div class="head-stats">
        <span>已添加 {{ models.length }}</span>
        <span class="dot">·</span>
        <span class="enabled-count">已启用 {{ enabledCount }}</span>
      </div>
    </div>

    <div class="list-toolbar">
      <ElInput
        v-model="keyword"
        placeholder="搜索模型名称或 ID"
        clearable
        size="small"
        class="search-input"
      >
        <template #prefix><i class="iconfont-sys">&#xe710;</i></template>
      </ElInput>
      <ElButton type="primary" size="small" :icon="Plus" @click="emit('add')">添加模型</ElButton>
    </div>

    <div class="list-body">
      <div v-for="m in filteredModels" :key="m.id" class="model-row">
        <div class="row-main">
          <div class="row-title">
            <span class="model-name">{{ m.name }}</span>
            <span class="model-id">{{ m.modelId }}</span>
          </div>
          <div class="row-tags">
            <span class="tag provider">{{ providerLabel }}</span>
            <span v-if="m.contextWindow" class="tag"
              >上下文 {{ formatTokens(m.contextWindow) }}</span
            >
            <span v-if="m.maxOutputTokens" class="tag"
              >输出 {{ formatTokens(m.maxOutputTokens) }}</span
            >
            <span v-if="m.supportText" class="tag cap">文本</span>
            <span v-if="m.supportImageInput" class="tag cap">图片输入</span>
            <span v-if="m.supportImageOutput" class="tag cap">图片输出</span>
            <span v-if="m.supportTools" class="tag cap">工具</span>
          </div>
        </div>
        <div class="row-ops">
          <ElSwitch
            :model-value="m.enabled"
            size="small"
            @update:model-value="emit('toggle', m.id, $event as boolean)"
          />
          <ElButton link size="small" @click="emit('test', m.id)">测试</ElButton>
          <ElButton link type="primary" size="small" @click="emit('edit', m.id)">编辑</ElButton>
          <ElButton link type="danger" size="small" @click="emit('remove', m.id)">删除</ElButton>
        </div>
      </div>

      <div v-if="!models.length" class="list-empty">暂无模型，点击「添加模型」创建</div>
      <div v-else-if="!filteredModels.length" class="list-empty">未找到匹配的模型</div>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { ElInput, ElButton, ElSwitch } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import type { ModelConfig } from '@/types/model'

  defineOptions({ name: 'ModelList' })

  const props = defineProps<{
    /** 当前配置下的模型 */
    models: ModelConfig[]
    /** 供应商展示名称 */
    providerLabel: string
  }>()

  const emit = defineEmits<{
    /** 添加模型 */
    add: []
    /** 编辑模型 */
    edit: [id: number]
    /** 删除模型 */
    remove: [id: number]
    /** 测试模型 */
    test: [id: number]
    /** 启用/禁用模型 */
    toggle: [id: number, enabled: boolean]
  }>()

  const keyword = ref('')

  /** 已启用数量 */
  const enabledCount = computed(() => props.models.filter((m) => m.enabled).length)

  /** 关键词过滤（名称或 ID） */
  const filteredModels = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    const sorted = [...props.models].sort((a, b) => a.sort - b.sort)
    if (!kw) return sorted
    return sorted.filter(
      (m) => m.name.toLowerCase().includes(kw) || m.modelId.toLowerCase().includes(kw)
    )
  })

  /** token 数格式化为易读单位 */
  const formatTokens = (n: number): string => {
    if (n >= 1000) return `${Math.round(n / 1000)}K`
    return String(n)
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .model-list {
    display: flex;
    flex-direction: column;
    height: 100%;

    .list-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      .section-title {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--art-text-gray-900);
      }

      .section-desc {
        margin: 4px 0 0;
        font-size: 12px;
        color: var(--art-text-gray-500);
      }

      .head-stats {
        display: flex;
        gap: 6px;
        align-items: center;
        font-size: 12px;
        color: var(--art-text-gray-600);
        white-space: nowrap;

        .enabled-count {
          color: rgb(var(--art-success));
        }

        .dot {
          color: var(--art-text-gray-400);
        }
      }
    }

    .list-toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
      margin: 12px 0;

      .search-input {
        width: 240px;
      }
    }

    .list-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    .model-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      margin-bottom: 8px;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 8px;

      .row-main {
        min-width: 0;
        flex: 1;

        .row-title {
          display: flex;
          gap: 8px;
          align-items: baseline;

          .model-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--art-text-gray-900);
          }

          .model-id {
            font-size: 12px;
            color: var(--art-text-gray-500);
          }
        }

        .row-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;

          .tag {
            padding: 1px 8px;
            font-size: 12px;
            color: var(--art-text-gray-600);
            background: var(--art-gray-100);
            border-radius: 4px;

            &.provider {
              color: rgb(var(--art-primary));
              background: rgba(var(--art-primary), 0.1);
            }

            &.cap {
              color: var(--art-text-gray-700);
            }
          }
        }
      }

      .row-ops {
        display: flex;
        flex-shrink: 0;
        gap: 4px;
        align-items: center;
        margin-left: 12px;
      }
    }

    .list-empty {
      padding: 32px 0;
      font-size: 13px;
      color: var(--art-text-gray-500);
      text-align: center;
    }
  }
</style>
