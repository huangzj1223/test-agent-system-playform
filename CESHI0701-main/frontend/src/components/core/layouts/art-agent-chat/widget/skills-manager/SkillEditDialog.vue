<!-- 新建/编辑 Skill 弹窗：基础信息 + 分类/风险 + 能力 + CLI/触发词/适用智能体 -->
<template>
  <ElDialog
    :model-value="visible"
    :title="isEdit ? '编辑 Skill' : '新建 Skill'"
    width="560px"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <ElForm :model="form" label-width="90px">
      <ElFormItem label="技能键" required>
        <ElInput v-model="form.skillKey" placeholder="kebab-case，如 my-skill" :disabled="isEdit" />
      </ElFormItem>
      <ElFormItem label="名称" required>
        <ElInput v-model="form.name" maxlength="100" placeholder="技能显示名称" />
      </ElFormItem>
      <ElFormItem label="类型">
        <ElSelect v-model="form.category" class="full">
          <ElOption v-for="o in categoryOptions" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="风险等级">
        <ElSelect v-model="form.riskLevel" class="full">
          <ElOption v-for="o in riskOptions" :key="o.value" :label="o.label" :value="o.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="描述">
        <ElInput v-model="form.description" type="textarea" :rows="2" maxlength="500" />
      </ElFormItem>
      <ElFormItem label="能力" required>
        <ElCheckboxGroup v-model="form.capabilities">
          <ElCheckbox v-for="c in catalog" :key="c.key" :value="c.key">
            {{ c.label }}
            <ElTag v-if="c.sensitive" size="small" type="danger">敏感</ElTag>
          </ElCheckbox>
        </ElCheckboxGroup>
      </ElFormItem>
      <ElFormItem label="CLI 命令">
        <ElInput v-model="form.cliCommand" maxlength="500" placeholder="如 npm run generate:backend -- --module {{name}}" />
      </ElFormItem>
      <ElFormItem label="触发关键词">
        <ElInput v-model="triggerKeywordsText" placeholder="多个用逗号分隔" />
      </ElFormItem>
      <ElFormItem label="适用智能体">
        <ElSelect
          v-model="form.applicableAgents"
          class="full"
          multiple
          collapse-tags
          placeholder="选择适用的智能体"
        >
          <ElOption v-for="a in agentOptions" :key="a" :label="a" :value="a" />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="emit('update:visible', false)">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="onSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, watch } from 'vue'
  import {
    ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption,
    ElCheckboxGroup, ElCheckbox, ElTag, ElButton, ElMessage
  } from 'element-plus'
  import type {
    AgentSkill, AgentCapabilityItem, SkillCategory, SkillRiskLevel, SkillEnums,
    CreateSkillPayload, UpdateSkillPayload
  } from '@/api/agentSkill'
  import { CATEGORY_OPTIONS, RISK_OPTIONS } from './skill-constants'

  defineOptions({ name: 'SkillEditDialog' })

  const props = defineProps<{
    /** 弹窗可见 */
    visible: boolean
    /** 编辑目标（null=新建） */
    editing: AgentSkill | null
    /** 能力目录 */
    catalog: AgentCapabilityItem[]
    /** 后端下发枚举（分类/风险/适用智能体，优先用它，空则本地兜底） */
    enums: SkillEnums
  }>()

  /** 分类下拉：优先后端枚举，空时兜底 */
  const categoryOptions = computed(() =>
    props.enums.categories.length
      ? props.enums.categories.map((c) => ({ value: c.key, label: c.label }))
      : CATEGORY_OPTIONS
  )
  /** 风险下拉：优先后端枚举，空时兜底 */
  const riskOptions = computed(() =>
    props.enums.riskLevels.length
      ? props.enums.riskLevels.map((r) => ({ value: r.key, label: r.label }))
      : RISK_OPTIONS
  )
  /** 适用智能体下拉选项（后端下发；含编辑目标里已有但清单外的值，避免回填丢失） */
  const agentOptions = computed(() => {
    const base = props.enums.agents ?? []
    const existing = props.editing?.applicableAgents ?? []
    return [...new Set([...base, ...existing])]
  })

  const emit = defineEmits<{
    'update:visible': [v: boolean]
    /** 提交新建 */
    create: [payload: CreateSkillPayload]
    /** 提交更新 */
    update: [payload: UpdateSkillPayload]
  }>()

  const submitting = ref(false)
  const isEdit = computed(() => props.editing !== null)

  /** 表单 */
  const form = reactive({
    skillKey: '',
    name: '',
    description: '',
    category: 'operation' as SkillCategory,
    riskLevel: 'L1' as SkillRiskLevel,
    capabilities: [] as string[],
    cliCommand: '',
    applicableAgents: [] as string[]
  })
  /** 触发词用逗号分隔文本编辑，提交时切分（适用智能体已改为下拉多选） */
  const triggerKeywordsText = ref('')

  /** 打开或切换编辑目标时回填表单 */
  watch(
    () => [props.visible, props.editing] as const,
    ([vis]) => {
      if (!vis) return
      const e = props.editing
      form.skillKey = e?.skillKey ?? ''
      form.name = e?.name ?? ''
      form.description = e?.description ?? ''
      form.category = e?.category ?? 'operation'
      form.riskLevel = e?.riskLevel ?? 'L1'
      form.capabilities = e ? [...e.capabilities] : []
      form.cliCommand = e?.cliCommand ?? ''
      form.applicableAgents = e?.applicableAgents ? [...e.applicableAgents] : []
      triggerKeywordsText.value = (e?.triggerKeywords || []).join('，')
    },
    { immediate: true }
  )

  /** 逗号（中英文）分隔切分为去空数组 */
  const splitList = (text: string): string[] =>
    text.split(/[,，]/).map((s) => s.trim()).filter(Boolean)

  /** 提交 */
  const onSubmit = () => {
    if (!form.skillKey || !form.name || !form.capabilities.length) {
      ElMessage.warning('请填写技能键、名称并至少选择一个能力')
      return
    }
    submitting.value = true
    try {
      const common = {
        name: form.name,
        description: form.description || undefined,
        capabilities: form.capabilities,
        category: form.category,
        riskLevel: form.riskLevel,
        cliCommand: form.cliCommand || undefined,
        triggerKeywords: splitList(triggerKeywordsText.value),
        applicableAgents: [...form.applicableAgents]
      }
      if (isEdit.value && props.editing) {
        emit('update', { id: props.editing.id, ...common })
      } else {
        emit('create', { skillKey: form.skillKey, ...common })
      }
    } finally {
      submitting.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .full {
    width: 100%;
  }
</style>
