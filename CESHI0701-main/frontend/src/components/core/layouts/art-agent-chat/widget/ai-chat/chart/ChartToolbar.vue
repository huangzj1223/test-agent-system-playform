<!-- 图表工具栏：刷新 / 全屏 / 下载 PNG / 查看原始数据，图标 + Tooltip -->
<template>
  <div class="chart-toolbar">
    <el-tooltip content="刷新" placement="top">
      <button class="tool-btn" type="button" @click="emit('refresh')">
        <el-icon :size="14"><Refresh /></el-icon>
      </button>
    </el-tooltip>
    <el-tooltip content="查看原始数据" placement="top">
      <button class="tool-btn" type="button" @click="emit('view-data')">
        <el-icon :size="14"><Grid /></el-icon>
      </button>
    </el-tooltip>
    <el-tooltip content="下载图片" placement="top">
      <button class="tool-btn" type="button" @click="emit('download')">
        <el-icon :size="14"><Download /></el-icon>
      </button>
    </el-tooltip>
    <el-tooltip :content="isFullscreen ? '退出全屏' : '全屏预览'" placement="top">
      <button class="tool-btn" type="button" @click="emit('toggle-fullscreen')">
        <el-icon :size="14">
          <component :is="isFullscreen ? Close : FullScreen" />
        </el-icon>
      </button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
  import { Refresh, Grid, Download, FullScreen, Close } from '@element-plus/icons-vue'

  defineOptions({ name: 'ChartToolbar' })

  defineProps<{
    /** 是否全屏（切换图标） */
    isFullscreen: boolean
  }>()

  const emit = defineEmits<{
    /** 刷新图表 */
    refresh: []
    /** 查看原始数据 */
    'view-data': []
    /** 下载 PNG */
    download: []
    /** 切换全屏 */
    'toggle-fullscreen': []
  }>()
</script>

<style lang="scss" scoped>
  .chart-toolbar {
    display: inline-flex;
    gap: 2px;

    .tool-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      color: var(--art-text-gray-500);
      cursor: pointer;
      background: transparent;
      border: none;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        color: rgb(var(--art-primary));
        background: var(--art-gray-100);
      }
    }
  }
</style>
