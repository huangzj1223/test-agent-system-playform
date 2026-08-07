<!-- 模型配置管理 - 模型新增/编辑弹窗 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="isEdit ? '编辑模型' : '添加模型'"
    width="560px"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
    @closed="onClosed"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px">
      <ElFormItem label="模型显示名称" prop="name">
        <ElInput v-model="form.name" placeholder="如 Claude Opus 4.8" />
      </ElFormItem>
      <ElFormItem label="模型 ID" prop="modelId">
        <ElInput v-model="form.modelId" placeholder="如 claude-opus-4-8" />
      </ElFormItem>
      <div class="dlg-row">
        <ElFormItem label="上下文窗口" class="dlg-col">
          <ElInputNumber
            v-model="form.contextWindow"
            :min="0"
            :step="1000"
            controls-position="right"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="最大输出" class="dlg-col">
          <ElInputNumber
            v-model="form.maxOutputTokens"
            :min="0"
            :step="1000"
            controls-position="right"
            style="width: 100%"
          />
        </ElFormItem>
      </div>
      <ElFormItem label="支持能力">
        <ElCheckboxGroup v-model="capabilities">
          <ElCheckbox value="text">文本输入</ElCheckbox>
          <ElCheckbox value="imageInput">图片输入</ElCheckbox>
          <ElCheckbox value="imageOutput">图片输出</ElCheckbox>
          <ElCheckbox value="tools">工具调用</ElCheckbox>
          <ElCheckbox value="stream">流式输出</ElCheckbox>
        </ElCheckboxGroup>
      </ElFormItem>
      <div class="dlg-row">
        <ElFormItem label="排序值" class="dlg-col">
          <ElInputNumber
            v-model="form.sort"
            :min="0"
            controls-position="right"
            style="width: 100%"
          />
        </ElFormItem>
        <ElFormItem label="是否启用" class="dlg-col">
          <ElSwitch v-model="form.enabled" />
        </ElFormItem>
      </div>
    </ElForm>

    <template #footer>
      <ElButton @click="emit('update:visible', false)">取消</ElButton>
      <ElButton type="primary" @click="onSubmit">确定</ElButton>
    </template>
  </ElDialog>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, reactive, computed, watch } from 'vue'
  import {
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElInputNumber,
    ElCheckbox,
    ElCheckboxGroup,
    ElSwitch,
    ElButton,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import type { ModelConfig } from '@/types/model'

  defineOptions({ name: 'ModelEditDialog' })

  const props = defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 编辑目标（新增时为 null） */
    model: ModelConfig | null
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
    /** 提交（传出模型字段） */
    submit: [payload: Partial<ModelConfig>]
  }>()

  const formRef = ref<FormInstance>()
  const isEdit = computed(() => !!props.model)

  /** 能力多选映射 */
  const capabilities = ref<string[]>(['text', 'stream'])

  const form = reactive<Partial<ModelConfig>>({
    name: '',
    modelId: '',
    contextWindow: undefined,
    maxOutputTokens: undefined,
    sort: 0,
    enabled: true
  })

  const rules: FormRules = {
    name: [{ required: true, message: '请输入模型显示名称', trigger: 'blur' }],
    modelId: [{ required: true, message: '请输入模型 ID', trigger: 'blur' }]
  }

  /** 打开时回填 */
  watch(
    () => props.visible,
    (v) => {
      if (!v) return
      const m = props.model
      Object.assign(form, {
        name: m?.name ?? '',
        modelId: m?.modelId ?? '',
        contextWindow: m?.contextWindow,
        maxOutputTokens: m?.maxOutputTokens,
        sort: m?.sort ?? 0,
        enabled: m?.enabled ?? true
      })
      capabilities.value = m ? buildCapabilityList(m) : ['text', 'stream']
    }
  )

  /** 由模型能力字段生成多选数组 */
  const buildCapabilityList = (m: ModelConfig): string[] => {
    const list: string[] = []
    if (m.supportText) list.push('text')
    if (m.supportImageInput) list.push('imageInput')
    if (m.supportImageOutput) list.push('imageOutput')
    if (m.supportTools) list.push('tools')
    if (m.supportStream) list.push('stream')
    return list
  }

  /** 提交 */
  const onSubmit = async () => {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    const caps = capabilities.value
    emit('submit', {
      // trim 名称与模型 ID，避免首尾空格造成"看似重复/不同"的脏数据
      name: form.name?.trim(),
      modelId: form.modelId?.trim(),
      contextWindow: form.contextWindow,
      maxOutputTokens: form.maxOutputTokens,
      sort: form.sort,
      enabled: form.enabled,
      supportText: caps.includes('text'),
      supportImageInput: caps.includes('imageInput'),
      supportImageOutput: caps.includes('imageOutput'),
      supportTools: caps.includes('tools'),
      supportStream: caps.includes('stream')
    })
  }

  /** 关闭后重置校验 */
  const onClosed = () => {
    formRef.value?.clearValidate()
  }
</script>

<style lang="scss" scoped>
  .dlg-row {
    display: flex;
    gap: 16px;

    .dlg-col {
      flex: 1;
      min-width: 0;
    }
  }
</style>
