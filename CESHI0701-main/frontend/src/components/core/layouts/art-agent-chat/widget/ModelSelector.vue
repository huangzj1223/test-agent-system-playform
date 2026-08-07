<!-- 底部模型选择器：按供应商分组，无模型时引导打开配置 -->
<template>
  <!-- 有可用模型：分组下拉 -->
  <ElSelect
    v-if="hasModel"
    :model-value="selectedValue"
    size="small"
    class="model-selector"
    :disabled="disabled"
    placeholder="选择模型"
    popper-class="model-selector-popper"
    @update:model-value="onSelect"
  >
    <template #label>
      <span class="selected-label">{{ selectedLabel }}</span>
    </template>
    <ElOptionGroup v-for="g in groups" :key="g.providerConfigId" :label="g.providerLabel">
      <ElOption
        v-for="m in g.models"
        :key="m.id"
        :label="`${g.providerLabel} / ${m.name}`"
        :value="`${g.providerConfigId}::${m.id}`"
      >
        <div class="opt-row">
          <span class="opt-name">{{ m.name }}</span>
          <span class="opt-meta">
            <span v-if="m.contextWindow" class="opt-ctx">{{ formatTokens(m.contextWindow) }}</span>
            <span v-if="m.supportImageInput" class="opt-cap">图</span>
            <span v-if="m.supportTools" class="opt-cap">工具</span>
          </span>
        </div>
      </ElOption>
    </ElOptionGroup>
  </ElSelect>

  <!-- 无可用模型：引导按钮 -->
  <button v-else class="no-model-btn" type="button" @click="emit('open-config')">
    <i class="iconfont-sys">&#xe6d0;</i>
    请先配置模型
  </button>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { computed } from 'vue'
  import { ElSelect, ElOption, ElOptionGroup } from 'element-plus'
  import type { AvailableModelGroup, CurrentModelSelection } from '@/types/model'

  defineOptions({ name: 'ModelSelector' })

  const props = defineProps<{
    /** 按供应商分组的可用模型 */
    groups: AvailableModelGroup[]
    /** 当前选择 */
    selection: CurrentModelSelection | null
    /** 是否禁用（如生成中） */
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    /** 选择模型 */
    select: [providerConfigId: number, modelId: number]
    /** 打开配置弹窗 */
    'open-config': []
  }>()

  /** 是否有可用模型 */
  const hasModel = computed(() => props.groups.some((g) => g.models.length > 0))

  /** 当前选中的组合值（providerConfigId::modelId） */
  const selectedValue = computed(() =>
    props.selection ? `${props.selection.providerConfigId}::${props.selection.modelId}` : ''
  )

  /** 当前选中项的展示文本（供应商 / 模型名） */
  const selectedLabel = computed(() => {
    if (!props.selection) return ''
    const g = props.groups.find((x) => x.providerConfigId === props.selection!.providerConfigId)
    const m = g?.models.find((x) => x.id === props.selection!.modelId)
    return g && m ? `${g.providerLabel} / ${m.name}` : ''
  })

  /** 选择变更（组合值 providerConfigId::modelId 拆回数字 ID 发出） */
  const onSelect = (val: string) => {
    const [pid, mid] = val.split('::')
    const providerConfigId = Number(pid)
    const modelId = Number(mid)
    if (Number.isInteger(providerConfigId) && Number.isInteger(modelId)) {
      emit('select', providerConfigId, modelId)
    }
  }

  /** token 数格式化 */
  const formatTokens = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(n))
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .model-selector {
    width: 180px;
  }

  .selected-label {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-model-btn {
    display: flex;
    gap: 4px;
    align-items: center;
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
    color: rgb(var(--art-danger));
    cursor: pointer;
    background: rgba(var(--art-danger), 0.08);
    border: 1px solid rgba(var(--art-danger), 0.2);
    border-radius: 6px;
    transition: background-color 0.2s;

    &:hover {
      background: rgba(var(--art-danger), 0.14);
    }

    i {
      font-size: 13px;
    }
  }
</style>

<style lang="scss">
  // 下拉选项行样式（popper 挂载到 body，需非 scoped）
  .model-selector-popper {
    .opt-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      .opt-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .opt-meta {
        display: flex;
        flex-shrink: 0;
        gap: 6px;
        align-items: center;

        .opt-ctx {
          font-size: 12px;
          color: var(--art-text-gray-500);
        }

        .opt-cap {
          padding: 0 5px;
          font-size: 11px;
          color: rgb(var(--art-primary));
          background: rgba(var(--art-primary), 0.1);
          border-radius: 3px;
        }
      }
    }
  }
</style>
