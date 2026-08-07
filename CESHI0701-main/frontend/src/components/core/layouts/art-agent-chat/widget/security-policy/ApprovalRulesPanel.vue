<!-- 审批规则：规则表格（增删改+启停）+ 表单弹窗 -->
<template>
  <div class="approval-panel">
    <div class="ap-head">
      <div class="ap-title-wrap">
        <span class="ap-title">审批规则</span>
        <span class="ap-desc">配置不同风险操作是否需要审批、审批方式、审批人和超时处理规则</span>
      </div>
      <ElButton type="primary" size="small" @click="openCreate">新建审批规则</ElButton>
    </div>

    <ElTable :data="store.approvalRules" size="small">
      <ElTableColumn label="规则名称" min-width="160" prop="name" show-overflow-tooltip />
      <ElTableColumn label="适用范围" width="110" prop="scope" />
      <ElTableColumn label="风险等级" width="140">
        <template #default="{ row }">
          <ElTag
            v-for="lv in row.riskLevels"
            :key="lv"
            :type="riskMeta(lv).tagType"
            size="small"
            effect="light"
            class="ap-risk-tag"
            :class="riskMeta(lv).className"
          >
            {{ lv }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="审批方式" width="100">
        <template #default="{ row }">{{ approvalModeLabel(row.approvalMode) }}</template>
      </ElTableColumn>
      <ElTableColumn label="审批人 / 角色" width="120" prop="approverRole" />
      <ElTableColumn label="超时处理" width="100">
        <template #default="{ row }">{{ timeoutActionLabel(row.timeoutAction) }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="70">
        <template #default="{ row }">
          <ElSwitch :model-value="row.enabled" @change="(v: boolean) => store.toggleApprovalRule(row.id, v)" />
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="110">
        <template #default="{ row }">
          <ElButton type="primary" size="small" link @click="openEdit(row)">编辑</ElButton>
          <ElButton type="danger" size="small" link @click="onRemove(row)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无审批规则</template>
    </ElTable>

    <ApprovalRuleFormModal v-model:visible="formVisible" :editing="editing" @save="store.saveApprovalRule" />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { ElTable, ElTableColumn, ElTag, ElButton, ElSwitch, ElMessage, ElMessageBox } from 'element-plus'
  import { useAgentSecurityStore } from '@/store/modules/agentSecurity'
  import ApprovalRuleFormModal from './ApprovalRuleFormModal.vue'
  import { RISK_META, APPROVAL_MODE_LABELS, TIMEOUT_ACTION_LABELS, type ApprovalRule, type RiskLevel, type ApprovalMode, type TimeoutAction } from './types'

  defineOptions({ name: 'ApprovalRulesPanel' })

  const store = useAgentSecurityStore()

  const formVisible = ref(false)
  const editing = ref<ApprovalRule | null>(null)

  const riskMeta = (r: RiskLevel) => RISK_META[r] || RISK_META.L1
  const approvalModeLabel = (m: ApprovalMode) => APPROVAL_MODE_LABELS[m] || m
  const timeoutActionLabel = (t: TimeoutAction) => TIMEOUT_ACTION_LABELS[t] || t

  /** 打开新建 */
  const openCreate = () => {
    editing.value = null
    formVisible.value = true
  }

  /** 打开编辑 */
  const openEdit = (row: ApprovalRule) => {
    editing.value = row
    formVisible.value = true
  }

  /** 删除（二次确认） */
  const onRemove = async (row: ApprovalRule) => {
    try {
      await ElMessageBox.confirm(`确定删除审批规则「${row.name}」？`, '删除确认', { type: 'warning' })
      store.removeApprovalRule(row.id)
      ElMessage.success('已删除')
    } catch {
      // 用户取消
    }
  }
</script>

<style lang="scss" scoped>
  .approval-panel {
    padding-right: 4px;
  }

  .ap-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;

    .ap-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ap-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .ap-desc {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .ap-risk-tag {
    margin-right: 4px;
  }

  // L4 深红
  :deep(.risk-l4) {
    color: #7f1d1d;
    background: rgba(127, 29, 29, 0.12);
    border-color: rgba(127, 29, 29, 0.3);
  }
</style>
