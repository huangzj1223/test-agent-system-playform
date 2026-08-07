<!-- 工具专属配置字段：按工具类型的字段描述，以描述驱动方式渲染各控件 -->
<template>
  <div class="config-fields">
    <ElFormItem v-for="f in fields" :key="f.key" :label="f.label">
      <!-- 开关 -->
      <ElSwitch
        v-if="f.control === 'switch'"
        :model-value="Boolean(model[f.key])"
        @update:model-value="(v) => update(f.key, Boolean(v))"
      />
      <!-- 数字 -->
      <ElInputNumber
        v-else-if="f.control === 'number'"
        :model-value="Number(model[f.key]) || 0"
        :min="0"
        controls-position="right"
        @update:model-value="(v) => update(f.key, v ?? 0)"
      />
      <!-- 下拉 -->
      <ElSelect
        v-else-if="f.control === 'select'"
        :model-value="String(model[f.key] ?? '')"
        class="cf-full"
        @update:model-value="(v) => update(f.key, v)"
      >
        <ElOption v-for="o in f.options" :key="o.value" :label="o.label" :value="o.value" />
      </ElSelect>
      <!-- 多行文本 -->
      <ElInput
        v-else-if="f.control === 'textarea'"
        :model-value="String(model[f.key] ?? '')"
        type="textarea"
        :rows="3"
        :placeholder="f.placeholder"
        @update:model-value="(v) => update(f.key, v)"
      />
      <!-- 单行文本 -->
      <ElInput
        v-else
        :model-value="String(model[f.key] ?? '')"
        :placeholder="f.placeholder"
        @update:model-value="(v) => update(f.key, v)"
      />
      <span v-if="f.suffix" class="cf-suffix">{{ f.suffix }}</span>
    </ElFormItem>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ElFormItem, ElInput, ElInputNumber, ElSwitch, ElSelect, ElOption } from 'element-plus'
  import { CONFIG_FIELDS } from './tool-config-fields'
  import type { ToolType } from './types'

  defineOptions({ name: 'ToolConfigFields' })

  const props = defineProps<{
    /** 工具类型（决定渲染哪组字段） */
    type: ToolType
    /** 配置对象（v-model 双向） */
    model: Record<string, unknown>
  }>()

  const emit = defineEmits<{
    'update:model': [value: Record<string, unknown>]
  }>()

  /** 当前类型对应的字段描述 */
  const fields = computed(() => CONFIG_FIELDS[props.type] || [])

  /** 更新单个字段并向上同步整个 config 对象 */
  const update = (key: string, value: unknown) => {
    emit('update:model', { ...props.model, [key]: value })
  }
</script>

<style lang="scss" scoped>
  .config-fields {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 20px;
  }

  .cf-full {
    width: 100%;
  }

  .cf-suffix {
    margin-left: 8px;
    font-size: 12px;
    color: var(--art-text-gray-500);
  }
</style>
