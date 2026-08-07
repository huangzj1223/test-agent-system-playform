<!-- 审批规则表单弹窗：新建/编辑审批规则 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="editing ? `编辑审批规则：${editing.name}` : '新建审批规则'"
    width="600px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElFormItem label="规则名称" prop="name">
        <ElInput v-model="form.name" placeholder="如 CLI 高风险命令审批" />
      </ElFormItem>
      <div class="af-grid">
        <ElFormItem label="适用范围" prop="scope">
          <ElSelect v-model="form.scope" class="af-full">
            <ElOption v-for="o in SCOPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="审批方式" prop="approvalMode">
          <ElSelect v-model="form.approvalMode" class="af-full">
            <ElOption v-for="o in APPROVAL_MODE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
      </div>
      <ElFormItem label="风险等级" prop="riskLevels">
        <ElCheckboxGroup v-model="form.riskLevels">
          <ElCheckbox v-for="o in RISK_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</ElCheckbox>
        </ElCheckboxGroup>
      </ElFormItem>
      <div class="af-grid">
        <ElFormItem label="审批人 / 角色" prop="approverRole">
          <ElInput v-model="form.approverRole" placeholder="如 系统管理员" />
        </ElFormItem>
        <ElFormItem label="审批超时时间">
          <ElInputNumber v-model="form.timeoutMinutes" :min="1" :max="1440" controls-position="right" class="af-full" />
          <span class="af-suffix">分钟</span>
        </ElFormItem>
      </div>
      <div class="af-grid">
        <ElFormItem label="超时处理" prop="timeoutAction">
          <ElSelect v-model="form.timeoutAction" class="af-full">
            <ElOption v-for="o in TIMEOUT_ACTION_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="是否启用">
          <ElSwitch v-model="form.enabled" />
        </ElFormItem>
      </div>
    </ElForm>

    <template #footer>
      <ElButton @click="emit('update:visible', false)">取消</ElButton>
      <ElButton type="primary" @click="onSubmit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, watch } from 'vue'
  import {
    ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElSwitch, ElButton,
    ElInputNumber, ElCheckbox, ElCheckboxGroup, ElMessage,
    type FormInstance, type FormRules
  } from 'element-plus'
  import {
    SCOPE_OPTIONS, APPROVAL_MODE_OPTIONS, TIMEOUT_ACTION_OPTIONS, RISK_OPTIONS,
    type ApprovalRule, type RiskLevel, type ApprovalMode, type TimeoutAction
  } from './types'

  defineOptions({ name: 'ApprovalRuleFormModal' })

  const props = defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 编辑目标（null=新建） */
    editing: ApprovalRule | null
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
    /** 保存 */
    save: [rule: ApprovalRule]
  }>()

  const formRef = ref<FormInstance>()

  /** 表单模型 */
  const form = reactive<ApprovalRule>({
    id: 0,
    name: '',
    scope: 'CLI 工具',
    riskLevels: [],
    approvalMode: 'manual',
    approverRole: '',
    timeoutMinutes: 30,
    timeoutAction: 'deny',
    enabled: true
  })

  /** 校验规则 */
  const rules: FormRules = {
    name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
    scope: [{ required: true, message: '请选择适用范围', trigger: 'change' }],
    approvalMode: [{ required: true, message: '请选择审批方式', trigger: 'change' }],
    riskLevels: [{ required: true, type: 'array', min: 1, message: '请至少选择一个风险等级', trigger: 'change' }],
    approverRole: [{ required: true, message: '请输入审批人 / 角色', trigger: 'blur' }]
  }

  /** 打开时回填 */
  watch(
    () => [props.visible, props.editing] as const,
    ([visible]) => {
      if (!visible) return
      if (props.editing) {
        Object.assign(form, { ...props.editing, riskLevels: [...props.editing.riskLevels] })
      } else {
        Object.assign(form, {
          id: 0,
          name: '',
          scope: 'CLI 工具',
          riskLevels: [] as RiskLevel[],
          approvalMode: 'manual' as ApprovalMode,
          approverRole: '',
          timeoutMinutes: 30,
          timeoutAction: 'deny' as TimeoutAction,
          enabled: true
        })
      }
    },
    { immediate: true }
  )

  /** 提交 */
  const onSubmit = async () => {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    emit('save', { ...form, riskLevels: [...form.riskLevels] })
    ElMessage.success(props.editing ? '审批规则已保存' : '审批规则已创建')
    emit('update:visible', false)
  }
</script>

<style lang="scss" scoped>
  .af-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 20px;
  }

  .af-full {
    width: 100%;
  }

  .af-suffix {
    margin-left: 8px;
    font-size: 12px;
    color: var(--art-text-gray-500);
  }
</style>
