<!-- 风险等级表单弹窗：新建/编辑风险等级策略 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="editing ? `编辑风险等级：${editing.level}` : '新建风险等级'"
    width="560px"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="rp-grid">
        <ElFormItem label="风险等级" prop="level">
          <ElSelect v-model="form.level" class="rp-full" :disabled="!!editing">
            <ElOption v-for="o in levelOptions" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="默认行为" prop="defaultAction">
          <ElSelect v-model="form.defaultAction" class="rp-full">
            <ElOption v-for="o in ACTION_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
      </div>
      <ElFormItem label="名称" prop="name">
        <ElInput v-model="form.name" placeholder="如 只读查询" />
      </ElFormItem>
      <ElFormItem label="说明" prop="description">
        <ElInput v-model="form.description" type="textarea" :rows="2" placeholder="等级说明" />
      </ElFormItem>
      <ElFormItem label="示例操作">
        <ElInput v-model="examplesText" type="textarea" :rows="2" placeholder="多个示例用逗号分隔" />
      </ElFormItem>
      <ElFormItem label="审批要求">
        <ElInput v-model="form.approvalRequirement" placeholder="如 需人工审批" />
      </ElFormItem>
      <ElFormItem label="是否启用">
        <ElSwitch v-model="form.enabled" />
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="emit('update:visible', false)">取消</ElButton>
      <ElButton type="primary" @click="onSubmit">保存</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, watch, computed } from 'vue'
  import {
    ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElSwitch, ElButton,
    type FormInstance, type FormRules
  } from 'element-plus'
  import { RISK_OPTIONS, ACTION_OPTIONS, type RiskLevelPolicy, type RiskLevel, type DefaultAction } from './types'

  defineOptions({ name: 'RiskPolicyFormModal' })

  const props = defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 编辑目标（null=新建） */
    editing: RiskLevelPolicy | null
    /** 已存在的风险等级（新建时从下拉中过滤） */
    existingLevels: RiskLevel[]
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
    /** 保存 */
    save: [policy: RiskLevelPolicy]
  }>()

  const formRef = ref<FormInstance>()

  /** 表单模型 */
  const form = reactive<RiskLevelPolicy>({
    level: 'L1',
    name: '',
    description: '',
    examples: [],
    approvalRequirement: '',
    defaultAction: 'allow',
    enabled: true
  })

  /** 等级下拉选项：编辑态显示全部（等级只读），新建态过滤掉已存在等级 */
  const levelOptions = computed(() =>
    props.editing ? RISK_OPTIONS : RISK_OPTIONS.filter((o) => !props.existingLevels.includes(o.value))
  )

  /** 示例操作文本（逗号分隔，与 form.examples 互转） */
  const examplesText = computed({
    get: () => form.examples.join('、'),
    set: (v: string) => {
      form.examples = v.split(/[，,、]/).map((s) => s.trim()).filter(Boolean)
    }
  })

  /** 校验规则 */
  const rules: FormRules = {
    level: [{ required: true, message: '请选择风险等级', trigger: 'change' }],
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    defaultAction: [{ required: true, message: '请选择默认行为', trigger: 'change' }]
  }

  /** 打开时回填 */
  watch(
    () => [props.visible, props.editing] as const,
    ([visible]) => {
      if (!visible) return
      if (props.editing) {
        Object.assign(form, { ...props.editing, examples: [...props.editing.examples] })
      } else {
        Object.assign(form, {
          level: (levelOptions.value[0]?.value ?? 'L1') as RiskLevel,
          name: '',
          description: '',
          examples: [],
          approvalRequirement: '',
          defaultAction: 'allow' as DefaultAction,
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
    emit('save', { ...form, examples: [...form.examples] })
    emit('update:visible', false)
  }
</script>

<style lang="scss" scoped>
  .rp-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 20px;
  }

  .rp-full {
    width: 100%;
  }
</style>
