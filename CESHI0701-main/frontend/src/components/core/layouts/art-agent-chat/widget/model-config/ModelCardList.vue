<!-- 模型配置 - 左侧全部模型卡片列表（跨供应商，含供应商标识/启用状态/主用标记） -->
<template>
  <div class="model-card-list">
    <div class="mcl-head">
      <span class="mcl-title">模型列表</span>
      <ElButton type="primary" link :icon="Plus" @click="emit('add')">添加模型</ElButton>
    </div>

    <div class="mcl-body">
      <div
        v-for="item in items"
        :key="item.model.id"
        class="mc-card"
        :class="{ active: item.model.id === selectedId }"
        role="button"
        tabindex="0"
        :aria-pressed="item.model.id === selectedId"
        @click="emit('select', item.model.id)"
        @keydown.enter.prevent.self="emit('select', item.model.id)"
        @keydown.space.prevent.self="emit('select', item.model.id)"
      >
        <div class="mc-top">
          <span class="mc-name">{{ item.model.name }}</span>
          <ElTag v-if="item.isPrimary" size="small" type="primary" effect="light">主用模型</ElTag>
          <!-- 主用模型右侧勾选标记 -->
          <ElIcon v-if="item.isPrimary" class="mc-check"><CircleCheckFilled /></ElIcon>
        </div>
        <div class="mc-provider">{{ item.providerLabel }}</div>
        <div class="mc-bottom">
          <span class="mc-status" :class="{ on: item.model.enabled }">
            {{ item.model.enabled ? '启用中' : '未启用' }}
          </span>
          <span class="mc-id">模型 ID: {{ item.model.modelId }}</span>
        </div>
        <!-- 悬停显示删除按钮 -->
        <button
          class="mc-del"
          type="button"
          title="删除模型"
          aria-label="删除模型"
          @click.stop="emit('remove', item.model.id)"
          @keydown.enter.stop
          @keydown.space.stop
        >
          <ElIcon><Delete /></ElIcon>
        </button>
      </div>

      <div v-if="!items.length" class="mcl-empty">暂无模型，点击「添加模型」创建</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElTag, ElIcon } from 'element-plus'
  import { Plus, CircleCheckFilled, Delete } from '@element-plus/icons-vue'
  import type { ModelConfig } from '@/types/model'

  defineOptions({ name: 'ModelCardList' })

  /** 卡片项：模型 + 供应商展示名 + 是否主用 */
  export interface ModelCardItem {
    model: ModelConfig
    providerId: number
    providerLabel: string
    isPrimary: boolean
  }

  defineProps<{
    /** 全部模型卡片项 */
    items: ModelCardItem[]
    /** 当前选中的模型 ID */
    selectedId: number | null
  }>()

  const emit = defineEmits<{
    /** 选中模型 */
    select: [modelId: number]
    /** 添加模型 */
    add: []
    /** 删除模型 */
    remove: [modelId: number]
  }>()
</script>

<style lang="scss" scoped>
  .model-card-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .mcl-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .mcl-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }
  }

  .mcl-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .mc-card {
    position: relative;
    padding: 12px;
    margin-bottom: 8px;
    cursor: pointer;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
    transition:
      border-color 0.15s,
      background-color 0.15s;

    &:hover {
      border-color: rgba(var(--art-primary), 0.5);

      .mc-del {
        opacity: 1;
      }
    }

    // 键盘聚焦卡片本身：给出焦点轮廓
    &:focus-visible {
      outline: 2px solid rgb(var(--art-primary));
      outline-offset: 2px;
    }

    // 卡片内任意元素获得焦点（含删除按钮）时也显示删除按钮
    &:focus-within .mc-del {
      opacity: 1;
    }

    .mc-del {
      position: absolute;
      right: 8px;
      bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      color: var(--art-text-gray-500);
      cursor: pointer;
      background: transparent;
      border: none;
      border-radius: 6px;
      opacity: 0;
      transition:
        opacity 0.15s,
        color 0.15s,
        background-color 0.15s;

      &:hover,
      &:focus-visible {
        color: rgb(var(--art-danger));
        background: rgba(var(--art-danger), 0.1);
      }

      &:focus-visible {
        outline: 2px solid rgb(var(--art-danger));
        outline-offset: 1px;
      }
    }

    &.active {
      background: rgba(var(--art-primary), 0.06);
      border-color: rgb(var(--art-primary));
    }

    .mc-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;

      .mc-name {
        overflow: hidden;
        font-size: 14px;
        font-weight: 600;
        color: var(--art-text-gray-900);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mc-check {
        flex-shrink: 0;
        margin-left: auto;
        font-size: 16px;
        color: rgb(var(--art-primary));
      }
    }

    .mc-provider {
      margin-top: 2px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    .mc-bottom {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 8px;

      .mc-status {
        font-size: 12px;
        color: var(--art-text-gray-400);

        &.on {
          color: rgb(var(--art-success));
        }
      }

      .mc-id {
        overflow: hidden;
        font-size: 12px;
        color: var(--art-text-gray-500);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }

  .mcl-empty {
    padding: 32px 0;
    font-size: 13px;
    color: var(--art-text-gray-500);
    text-align: center;
  }
</style>
