<!-- 工具配置/新建弹窗：基础信息 + 按工具类型动态渲染专属配置字段 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="title"
    width="720px"
    top="8vh"
    append-to-body
    :close-on-click-modal="false"
    class="tool-form-dialog"
    @update:model-value="emit('update:visible', $event)"
    @closed="onClosed"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" class="tf-form">
      <!-- 基础信息 -->
      <div class="tf-section-title">基础信息</div>
      <div class="tf-grid">
        <ElFormItem label="工具名称" prop="name">
          <ElInput v-model="form.name" placeholder="工具名称" />
        </ElFormItem>
        <ElFormItem label="工具标识" prop="key">
          <ElInput v-model="form.key" placeholder="唯一标识，如 backend-generator" />
        </ElFormItem>
        <ElFormItem label="工具类型" prop="type">
          <ElSelect v-model="form.type" class="tf-full" @change="onTypeChange">
            <ElOption v-for="o in TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="风险等级" prop="riskLevel">
          <ElSelect v-model="form.riskLevel" class="tf-full">
            <ElOption
              v-for="o in RISK_OPTIONS"
              :key="o.value"
              :label="`${o.label} · ${RISK_META[o.value].desc}`"
              :value="o.value"
            />
          </ElSelect>
        </ElFormItem>
      </div>
      <ElFormItem label="工具描述" prop="description">
        <ElInput v-model="form.description" type="textarea" :rows="2" placeholder="工具用途描述" />
      </ElFormItem>
      <div class="tf-grid">
        <ElFormItem label="适用智能体">
          <ElSelect v-model="form.applicableAgents" multiple class="tf-full" placeholder="选择适用智能体">
            <ElOption v-for="a in AGENT_OPTIONS" :key="a" :label="a" :value="a" />
          </ElSelect>
        </ElFormItem>
        <div class="tf-switches">
          <div class="tf-switch-item">
            <span>是否启用</span>
            <ElSwitch v-model="form.enabled" />
          </div>
          <div class="tf-switch-item">
            <span>需要人工确认</span>
            <ElSwitch v-model="form.requireConfirm" />
          </div>
        </div>
      </div>

      <!-- 类型专属配置 -->
      <div class="tf-section-title">{{ typeLabel }}配置</div>
      <ToolConfigFields v-model:model="form.config" :type="form.type" />
    </ElForm>

    <template #footer>
      <ElButton @click="emit('update:visible', false)">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="onSubmit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, watch } from 'vue'
  import {
    ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElSwitch, ElButton, ElMessage,
    type FormInstance, type FormRules
  } from 'element-plus'
  import ToolConfigFields from './ToolConfigFields.vue'
  import { TYPE_OPTIONS, RISK_OPTIONS, RISK_META, TYPE_LABELS, type AgentTool, type ToolType, type RiskLevel } from './types'
  import { defaultConfig } from './tool-config-fields'

  defineOptions({ name: 'ToolFormModal' })

  const props = defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 编辑目标（null=新建） */
    editing: AgentTool | null
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
    /** 保存（新建或更新后的完整工具对象） */
    save: [tool: AgentTool]
  }>()

  /** 可选适用智能体（mock） */
  const AGENT_OPTIONS = ['AG-UI 智能体', '开发助手智能体', '运维智能体']

  const formRef = ref<FormInstance>()
  const saving = ref(false)

  /** 表单模型 */
  const form = reactive<{
    name: string
    key: string
    type: ToolType
    description: string
    riskLevel: RiskLevel
    enabled: boolean
    requireConfirm: boolean
    applicableAgents: string[]
    config: Record<string, unknown>
  }>({
    name: '',
    key: '',
    type: 'cli',
    description: '',
    riskLevel: 'L1',
    enabled: true,
    requireConfirm: false,
    applicableAgents: [],
    config: defaultConfig('cli')
  })

  /** 校验规则 */
  const rules: FormRules = {
    name: [{ required: true, message: '请输入工具名称', trigger: 'blur' }],
    key: [{ required: true, message: '请输入工具标识', trigger: 'blur' }],
    type: [{ required: true, message: '请选择工具类型', trigger: 'change' }],
    riskLevel: [{ required: true, message: '请选择风险等级', trigger: 'change' }]
  }

  /** 弹窗标题：编辑显示工具名，新建显示通用标题 */
  const title = computed(() => (props.editing ? `配置工具：${props.editing.name}` : '新建工具'))
  /** 当前类型显示名 */
  const typeLabel = computed(() => TYPE_LABELS[form.type] || '')

  /** 切换类型时重置为该类型默认配置（保留编辑态已有值不覆盖靠 watch 回填） */
  const onTypeChange = () => {
    form.config = defaultConfig(form.type)
  }

  /** 打开时回填：编辑态用目标数据，新建态重置为默认 */
  watch(
    () => [props.visible, props.editing] as const,
    ([visible]) => {
      if (!visible) return
      if (props.editing) {
        const e = props.editing
        Object.assign(form, {
          name: e.name,
          key: e.key,
          type: e.type,
          description: e.description,
          riskLevel: e.riskLevel,
          enabled: e.enabled,
          requireConfirm: e.requireConfirm,
          applicableAgents: [...e.applicableAgents],
          config: { ...e.config }
        })
      } else {
        Object.assign(form, {
          name: '',
          key: '',
          type: 'cli' as ToolType,
          description: '',
          riskLevel: 'L1' as RiskLevel,
          enabled: true,
          requireConfirm: false,
          applicableAgents: [],
          config: defaultConfig('cli')
        })
      }
    },
    { immediate: true }
  )

  /** 提交保存 */
  const onSubmit = async () => {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    saving.value = true
    try {
      const now = nowText()
      const tool: AgentTool = {
        id: props.editing?.id || `tool-${Date.now()}`,
        name: form.name,
        key: form.key,
        type: form.type,
        description: form.description,
        riskLevel: form.riskLevel,
        enabled: form.enabled,
        requireConfirm: form.requireConfirm,
        applicableAgents: [...form.applicableAgents],
        config: { ...form.config },
        createdAt: props.editing?.createdAt || now,
        updatedAt: now
      }
      emit('save', tool)
      ElMessage.success(props.editing ? '工具配置已保存' : '工具已创建')
      emit('update:visible', false)
    } finally {
      saving.value = false
    }
  }

  /** 弹窗关闭后重置校验态 */
  const onClosed = () => {
    formRef.value?.clearValidate()
  }

  /** 生成当前时间文本 */
  function nowText(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
</script>

<style lang="scss" scoped>
  .tf-form {
    max-height: 62vh;
    padding-right: 6px;
    overflow-y: auto;
  }

  .tf-section-title {
    padding-bottom: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--art-text-gray-800);
    border-bottom: 1px solid var(--art-border-color);

    &:not(:first-child) {
      margin-top: 8px;
    }
  }

  .tf-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 20px;
  }

  .tf-full {
    width: 100%;
  }

  .tf-switches {
    display: flex;
    gap: 24px;
    align-items: center;
    padding-top: 30px;

    .tf-switch-item {
      display: flex;
      gap: 10px;
      align-items: center;
      font-size: 13px;
      color: var(--art-text-gray-700);
    }
  }
</style>

