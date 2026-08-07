<!-- 敏感词策略：顶部统计 + 敏感词表格（增删改+启停）+ 表单弹窗 -->
<template>
  <div class="sensitive-panel">
    <div class="sen-head">
      <div class="sen-title-wrap">
        <span class="sen-title">敏感词策略</span>
        <span class="sen-desc">配置智能体在对话、工具调用、CLI 执行、记忆写入和日志展示中的敏感信息识别与处理规则</span>
      </div>
      <ElButton type="primary" size="small" @click="openCreate">新建敏感词</ElButton>
    </div>

    <!-- 顶部统计 -->
    <div class="sen-stats">
      <div v-for="s in statCards" :key="s.label" class="sen-stat">
        <div class="sen-stat-value">{{ s.value }}</div>
        <div class="sen-stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- 敏感词表格 -->
    <ElTable :data="store.sensitiveRules" size="small">
      <ElTableColumn label="敏感类型" width="140" prop="type" />
      <ElTableColumn label="匹配规则" min-width="180">
        <template #default="{ row }"><code class="sen-pattern">{{ row.pattern }}</code></template>
      </ElTableColumn>
      <ElTableColumn label="处理方式" width="150">
        <template #default="{ row }">
          <ElTag :type="actionMeta(row.action).tagType" size="small" effect="light">
            {{ actionMeta(row.action).label }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="适用范围" min-width="140">
        <template #default="{ row }">{{ row.scopes.join(' / ') }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="70">
        <template #default="{ row }">
          <ElSwitch :model-value="row.enabled" @change="(v: boolean) => store.toggleSensitiveRule(row.id, v)" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="110">
        <template #default="{ row }">
          <ElButton type="primary" size="small" link @click="openEdit(row)">编辑</ElButton>
          <ElButton type="danger" size="small" link @click="onRemove(row)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无敏感词规则</template>
    </ElTable>

    <!-- 敏感词表单弹窗 -->
    <ElDialog v-model="dialogVisible" :title="editing ? '编辑敏感词' : '新建敏感词'" width="520px" append-to-body>
      <ElForm label-position="top">
        <ElFormItem label="敏感类型">
          <ElInput v-model="form.type" placeholder="如 密码字段" />
        </ElFormItem>
        <ElFormItem label="匹配规则">
          <ElInput v-model="form.pattern" placeholder="如 password / passwd / pwd，多个用 / 分隔" />
        </ElFormItem>
        <ElFormItem label="处理方式">
          <ElSelect v-model="form.action" class="sen-full">
            <ElOption v-for="o in SENSITIVE_ACTION_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="适用范围">
          <ElCheckboxGroup v-model="form.scopes">
            <ElCheckbox v-for="o in SENSITIVE_SCOPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</ElCheckbox>
          </ElCheckboxGroup>
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
  import { ref, reactive, computed } from 'vue'
  import {
    ElTable, ElTableColumn, ElTag, ElButton, ElSwitch, ElDialog, ElForm, ElFormItem,
    ElInput, ElSelect, ElOption, ElCheckbox, ElCheckboxGroup, ElMessage, ElMessageBox
  } from 'element-plus'
  import { useAgentSecurityStore } from '@/store/modules/agentSecurity'
  import { SENSITIVE_ACTION_META, SENSITIVE_ACTION_OPTIONS, SENSITIVE_SCOPE_OPTIONS, type SensitiveRule, type SensitiveAction } from './types'

  defineOptions({ name: 'SensitivePolicyPanel' })

  const store = useAgentSecurityStore()

  /** 顶部统计卡片 */
  const statCards = computed(() => [
    { label: '敏感词数量', value: store.sensitiveStats.total },
    { label: '已启用规则', value: store.sensitiveStats.enabled },
    { label: '今日拦截', value: store.sensitiveStats.blockedToday },
    { label: '待处理', value: store.sensitiveStats.pending }
  ])

  const dialogVisible = ref(false)
  const editing = ref<SensitiveRule | null>(null)

  /** 表单模型 */
  const form = reactive<{ type: string; pattern: string; action: SensitiveAction; scopes: string[] }>({
    type: '',
    pattern: '',
    action: 'mask',
    scopes: []
  })

  const actionMeta = (a: SensitiveAction) => SENSITIVE_ACTION_META[a] || SENSITIVE_ACTION_META.allow

  /** 打开新建 */
  const openCreate = () => {
    editing.value = null
    Object.assign(form, { type: '', pattern: '', action: 'mask', scopes: [] })
    dialogVisible.value = true
  }

  /** 打开编辑 */
  const openEdit = (row: SensitiveRule) => {
    editing.value = row
    Object.assign(form, { type: row.type, pattern: row.pattern, action: row.action, scopes: [...row.scopes] })
    dialogVisible.value = true
  }

  /** 删除（二次确认） */
  const onRemove = async (row: SensitiveRule) => {
    try {
      await ElMessageBox.confirm(`确定删除敏感词规则「${row.type}」？`, '删除确认', { type: 'warning' })
      store.removeSensitiveRule(row.id)
      ElMessage.success('已删除')
    } catch {
      // 用户取消
    }
  }

  /** 提交 */
  const onSubmit = () => {
    if (!form.type.trim() || !form.pattern.trim()) {
      ElMessage.warning('请填写敏感类型与匹配规则')
      return
    }
    store.saveSensitiveRule({
      id: editing.value?.id || 0,
      type: form.type.trim(),
      pattern: form.pattern.trim(),
      action: form.action,
      scopes: [...form.scopes],
      enabled: editing.value?.enabled ?? true
    })
    dialogVisible.value = false
    ElMessage.success(editing.value ? '已保存' : '已新增')
  }
</script>

<style lang="scss" scoped>
  .sensitive-panel {
    padding-right: 4px;
  }

  .sen-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;

    .sen-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sen-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .sen-desc {
      max-width: 560px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .sen-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .sen-stat {
    padding: 12px 16px;
    text-align: center;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;

    .sen-stat-value {
      font-size: 22px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .sen-stat-label {
      margin-top: 4px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .sen-pattern {
    font-family: var(--art-font-mono, monospace);
    font-size: 12px;
    color: var(--art-text-gray-700);
  }

  .sen-full {
    width: 100%;
  }
</style>