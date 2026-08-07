<!-- 黑白名单单区：标题 + 新增 + 名单表格（内容/说明/风险/状态/编辑删除），内置行内编辑弹窗 -->
<template>
  <div class="list-section">
    <div class="ls-head">
      <span class="ls-title">{{ title }}</span>
      <ElButton size="small" text type="primary" @click="openCreate">
        <i class="iconfont-sys ls-plus">&#xe7d8;</i>新增
      </ElButton>
    </div>

    <ElTable :data="items" size="small">
      <ElTableColumn :label="valueLabel" min-width="200">
        <template #default="{ row }"><code class="ls-value">{{ (row as ListItem).value }}</code></template>
      </ElTableColumn>
      <ElTableColumn label="说明" min-width="140" prop="description" show-overflow-tooltip />
      <ElTableColumn v-if="showRisk" label="风险等级" width="90">
        <template #default="{ row }">
          <ElTag
            v-if="(row as ListItem).riskLevel"
            :type="riskMeta((row as ListItem).riskLevel!).tagType"
            size="small"
            effect="light"
            :class="riskMeta((row as ListItem).riskLevel!).className"
          >
            {{ (row as ListItem).riskLevel }}
          </ElTag>
          <span v-else>—</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="70">
        <template #default="{ row }">
          <ElSwitch :model-value="(row as ListItem).enabled" @change="(v: boolean) => emit('toggle', (row as ListItem).id, v)" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="100">
        <template #default="{ row }">
          <ElButton type="primary" size="small" link @click="openEdit(row as ListItem)">编辑</ElButton>
          <ElButton type="danger" size="small" link @click="emit('remove', (row as ListItem).id)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无数据</template>
    </ElTable>

    <!-- 行内编辑弹窗 -->
    <ElDialog v-model="dialogVisible" :title="editing ? '编辑条目' : '新增条目'" width="480px" append-to-body>
      <ElForm label-position="top">
        <ElFormItem :label="valueLabel">
          <ElInput v-model="form.value" :placeholder="valueLabel" />
        </ElFormItem>
        <ElFormItem label="说明">
          <ElInput v-model="form.description" placeholder="说明" />
        </ElFormItem>
        <ElFormItem v-if="showRisk" label="风险等级">
          <ElSelect v-model="form.riskLevel" clearable class="ls-full">
            <ElOption v-for="o in RISK_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="onSubmit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive } from 'vue'
  import {
    ElTable, ElTableColumn, ElTag, ElButton, ElSwitch, ElDialog, ElForm, ElFormItem,
    ElInput, ElSelect, ElOption, ElMessage
  } from 'element-plus'
  import { RISK_META, RISK_OPTIONS, type ListItem, type RiskLevel } from './types'

  defineOptions({ name: 'ListSection' })

  const props = defineProps<{
    /** 区标题 */
    title: string
    /** 内容列标签，如 命令模板 / 目录 / API 路径 */
    valueLabel: string
    /** 名单条目 */
    items: ListItem[]
    /** 是否展示风险等级列 */
    showRisk: boolean
  }>()

  const emit = defineEmits<{
    /** 新增或更新 */
    save: [item: ListItem]
    /** 删除 */
    remove: [id: string]
    /** 切换启用 */
    toggle: [id: string, enabled: boolean]
  }>()

  const dialogVisible = ref(false)
  const editing = ref<ListItem | null>(null)

  /** 编辑表单 */
  const form = reactive<{ value: string; description: string; riskLevel?: RiskLevel }>({
    value: '',
    description: '',
    riskLevel: undefined
  })

  const riskMeta = (r: RiskLevel) => RISK_META[r] || RISK_META.L1

  /** 打开新建 */
  const openCreate = () => {
    editing.value = null
    Object.assign(form, { value: '', description: '', riskLevel: undefined })
    dialogVisible.value = true
  }

  /** 打开编辑 */
  const openEdit = (row: ListItem) => {
    editing.value = row
    Object.assign(form, { value: row.value, description: row.description, riskLevel: row.riskLevel })
    dialogVisible.value = true
  }

  /** 提交 */
  const onSubmit = () => {
    if (!form.value.trim()) {
      ElMessage.warning(`请输入${props.valueLabel}`)
      return
    }
    emit('save', {
      id: editing.value?.id || 0,
      value: form.value.trim(),
      description: form.description.trim(),
      riskLevel: props.showRisk ? form.riskLevel : undefined,
      enabled: editing.value?.enabled ?? true
    })
    dialogVisible.value = false
    ElMessage.success(editing.value ? '已保存' : '已新增')
  }
</script>

<style lang="scss" scoped>
  .list-section {
    padding: 14px 16px;
    margin-bottom: 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .ls-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;

    .ls-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .ls-plus {
      margin-right: 2px;
      font-size: 12px;
    }
  }

  .ls-value {
    font-family: var(--art-font-mono, monospace);
    font-size: 12px;
    color: var(--art-text-gray-700);
  }

  .ls-full {
    width: 100%;
  }

  // L4 深红
  :deep(.risk-l4) {
    color: #7f1d1d;
    background: rgba(127, 29, 29, 0.12);
    border-color: rgba(127, 29, 29, 0.3);
  }
</style>
