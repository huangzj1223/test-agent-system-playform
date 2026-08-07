<!-- 记忆文件列表：文件名 + 描述 + 启用标签 + 最近更新，选中高亮 -->
<template>
  <div class="mem-file-list">
    <div class="mfl-header">
      <span class="mfl-title">记忆文件</span>
      <ElButton type="primary" size="small" text @click="emit('create')">
        <i class="iconfont-sys mfl-plus">&#xe7d8;</i>新建文件
      </ElButton>
    </div>

    <div class="mfl-items">
      <button
        v-for="file in files"
        :key="file.id"
        type="button"
        class="mfl-item"
        :class="{ 'is-active': file.id === selectedId }"
        @click="emit('select', file.id)"
      >
        <i class="iconfont-sys mfl-file-icon">&#xe816;</i>
        <div class="mfl-info">
          <div class="mfl-name-row">
            <span class="mfl-name">{{ file.name }}</span>
            <ElTag
              v-if="file.enabled"
              type="success"
              size="small"
              effect="light"
              class="mfl-toggle"
              title="点击停用"
              @click.stop="emit('toggle', file.id, false)"
              >已启用</ElTag
            >
            <ElTag
              v-else
              type="info"
              size="small"
              effect="light"
              class="mfl-toggle"
              title="点击启用"
              @click.stop="emit('toggle', file.id, true)"
              >已禁用</ElTag
            >
          </div>
          <div class="mfl-desc">{{ file.desc }}</div>
        </div>
        <span class="mfl-time">{{ file.updatedAt }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElTag } from 'element-plus'
  import type { MemoryFile } from './memory-constants'

  defineOptions({ name: 'MemoryFileList' })

  defineProps<{
    /** 记忆文件列表 */
    files: MemoryFile[]
    /** 当前选中文件 ID */
    selectedId: string
  }>()

  const emit = defineEmits<{
    /** 选中文件 */
    select: [id: string]
    /** 新建文件 */
    create: []
    /** 启用/停用文件 */
    toggle: [id: string, enabled: boolean]
  }>()
</script>

<style lang="scss" scoped>
  .mfl-toggle {
    cursor: pointer;
  }

  .mem-file-list {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .mfl-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--art-border-color);

    .mfl-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .mfl-plus {
      margin-right: 2px;
      font-size: 13px;
    }
  }

  .mfl-items {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
  }

  .mfl-item {
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 4px;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    transition: background 0.15s;

    &:hover {
      background: var(--art-gray-100);
    }

    // 选中态：浅主色底 + 主色描边
    &.is-active {
      background: rgba(var(--art-primary), 0.08);
      border-color: var(--art-primary);
    }

    .mfl-file-icon {
      flex-shrink: 0;
      font-size: 18px;
      color: var(--art-text-gray-500);
    }

    .mfl-info {
      flex: 1;
      min-width: 0;
    }

    .mfl-name-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .mfl-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .mfl-desc {
      margin-top: 2px;
      overflow: hidden;
      font-size: 12px;
      color: var(--art-text-gray-500);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mfl-time {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--art-text-gray-400);
    }
  }
</style>
