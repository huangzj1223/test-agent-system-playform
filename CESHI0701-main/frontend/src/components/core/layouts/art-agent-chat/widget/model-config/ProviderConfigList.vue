<!-- 模型配置管理 - 左侧供应商配置列表 -->
<template>
  <div class="provider-config-list">
    <!-- 顶部标题与新增 -->
    <div class="list-head">
      <div class="head-text">
        <h4 class="head-title">配置列表</h4>
        <p class="head-desc">管理不同模型供应商及其连接配置</p>
      </div>
      <ElButton type="primary" size="small" :icon="Plus" @click="emit('add')">新增配置</ElButton>
    </div>

    <!-- 配置卡片列表 -->
    <ElScrollbar class="list-scroll">
      <div
        v-for="cfg in configs"
        :key="cfg.id"
        class="config-card"
        :class="{ 'is-active': cfg.id === activeId }"
        @click="emit('select', cfg.id)"
      >
        <div class="card-top">
          <span class="config-name">{{ cfg.name }}</span>
          <div class="card-ops" @click.stop>
            <ElSwitch
              :model-value="cfg.enabled"
              size="small"
              @update:model-value="emit('toggle', cfg.id, $event as boolean)"
            />
            <ElTooltip content="删除配置" placement="top">
              <button
                class="del-btn"
                type="button"
                aria-label="删除配置"
                @click="emit('remove', cfg.id)"
              >
                <i class="iconfont-sys">&#xe83a;</i>
              </button>
            </ElTooltip>
          </div>
        </div>

        <div class="card-meta">
          <span class="provider-tag">{{ providerLabel(cfg.provider) }}</span>
          <span class="endpoint" :title="cfg.apiEndpoint">{{
            cfg.apiEndpoint || '未设置 Endpoint'
          }}</span>
        </div>

        <div class="card-stats">
          <span>模型 {{ cfg.models.length }}</span>
          <span class="dot">·</span>
          <span class="enabled-count">已启用 {{ enabledCount(cfg) }}</span>
        </div>
      </div>

      <div v-if="!configs.length" class="list-empty">暂无配置，点击右上角新增</div>
    </ElScrollbar>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ElButton, ElSwitch, ElTooltip, ElScrollbar } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { PROVIDER_OPTIONS } from '@/store/modules/modelConfig'
  import type { ModelProviderConfig, ModelProvider } from '@/types/model'

  defineOptions({ name: 'ProviderConfigList' })

  defineProps<{
    /** 全部配置 */
    configs: ModelProviderConfig[]
    /** 当前选中配置 ID */
    activeId: number | null
  }>()

  const emit = defineEmits<{
    /** 选择配置 */
    select: [id: number]
    /** 新增配置 */
    add: []
    /** 删除配置 */
    remove: [id: number]
    /** 启用/禁用配置 */
    toggle: [id: number, enabled: boolean]
  }>()

  /** 供应商展示名称 */
  const providerLabel = (provider: ModelProvider): string =>
    PROVIDER_OPTIONS.find((p) => p.value === provider)?.label ?? provider

  /** 已启用模型数量 */
  const enabledCount = (cfg: ModelProviderConfig): number =>
    cfg.models.filter((m) => m.enabled).length
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .provider-config-list {
    display: flex;
    flex-direction: column;
    height: 100%;

    .list-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 12px;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--art-border-color);

      .head-title {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--art-text-gray-900);
      }

      .head-desc {
        margin: 4px 0 0;
        font-size: 12px;
        color: var(--art-text-gray-500);
      }
    }

    .list-scroll {
      flex: 1;
      min-height: 0;
    }

    .config-card {
      padding: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 8px;
      transition:
        border-color 0.2s,
        background-color 0.2s;

      &:hover {
        border-color: rgb(var(--art-primary));
      }

      // 选中态：蓝色边框 + 浅蓝背景
      &.is-active {
        background: rgba(var(--art-primary), 0.06);
        border-color: rgb(var(--art-primary));
      }

      .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .config-name {
          overflow: hidden;
          font-size: 14px;
          font-weight: 600;
          color: var(--art-text-gray-900);
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-ops {
          display: flex;
          gap: 8px;
          align-items: center;

          .del-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            color: var(--art-text-gray-500);
            cursor: pointer;
            background: transparent;
            border: none;
            border-radius: 4px;

            &:hover {
              color: rgb(var(--art-danger));
              background: var(--art-gray-100);
            }

            i {
              font-size: 13px;
            }
          }
        }
      }

      .card-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 8px;

        .provider-tag {
          flex-shrink: 0;
          padding: 2px 8px;
          font-size: 12px;
          color: rgb(var(--art-primary));
          background: rgba(var(--art-primary), 0.1);
          border-radius: 4px;
        }

        .endpoint {
          overflow: hidden;
          font-size: 12px;
          color: var(--art-text-gray-500);
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .card-stats {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-top: 8px;
        font-size: 12px;
        color: var(--art-text-gray-600);

        .enabled-count {
          color: rgb(var(--art-success));
        }

        .dot {
          color: var(--art-text-gray-400);
        }
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
