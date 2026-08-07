<!-- 审计策略：记录范围开关 + 保留周期 + 告警/脱敏开关 + 保存 -->
<template>
  <div class="audit-panel">
    <div class="au-head">
      <div class="au-title-wrap">
        <span class="au-title">审计策略</span>
        <span class="au-desc">配置哪些智能体操作需要记录审计日志，以及日志保留周期和查看权限</span>
      </div>
      <ElButton type="primary" size="small" @click="onSave">保存配置</ElButton>
    </div>

    <!-- 记录范围开关列表 -->
    <div class="au-list">
      <div v-for="item in switchItems" :key="item.key" class="au-item">
        <div class="au-info">
          <div class="au-label">{{ item.label }}</div>
          <div class="au-tip">{{ item.desc }}</div>
        </div>
        <ElSwitch :model-value="p[item.key]" @update:model-value="(v) => (p[item.key] = Boolean(v))" />
      </div>

      <!-- 日志保留周期 -->
      <div class="au-item">
        <div class="au-info">
          <div class="au-label">日志保留周期</div>
          <div class="au-tip">超过保留周期的审计日志将被自动清理</div>
        </div>
        <ElInputNumber v-model="p.retentionDays" :min="1" :max="3650" controls-position="right" class="au-num" />
        <span class="au-suffix">天</span>
      </div>
    </div>

    <div class="au-save-bar">
      <ElButton type="primary" @click="onSave">保存配置</ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElButton, ElSwitch, ElInputNumber, ElMessage } from 'element-plus'
  import { useAgentSecurityStore } from '@/store/modules/agentSecurity'
  import type { AuditPolicy } from './types'

  defineOptions({ name: 'AuditPolicyPanel' })

  const store = useAgentSecurityStore()
  /** 审计策略引用 */
  const p = store.auditPolicy

  /** 开关项配置（除保留周期外的布尔字段） */
  const switchItems: { key: keyof AuditPolicy; label: string; desc: string }[] = [
    { key: 'recordConversation', label: '记录对话日志', desc: '记录用户输入、智能体回复、命中 Skill 和模型调用信息' },
    { key: 'recordSkillCall', label: '记录 Skill 调用日志', desc: '记录 Skill 触发、输入参数、输出结果和执行状态' },
    { key: 'recordToolExecution', label: '记录工具执行日志', desc: '记录 CLI、API、数据库、文件、页面操作执行信息' },
    { key: 'recordMemoryHit', label: '记录记忆命中日志', desc: '记录记忆文件命中、命中分数和使用位置' },
    { key: 'recordApproval', label: '记录审批日志', desc: '记录审批人、审批时间、审批结果和审批意见' },
    { key: 'failureAlert', label: '失败日志告警', desc: '操作失败时触发告警通知' },
    { key: 'highRiskAlert', label: '高风险操作告警', desc: 'L3 / L4 高风险操作触发告警通知' },
    { key: 'maskSensitiveData', label: '敏感信息脱敏存储', desc: '审计日志中的敏感信息脱敏后再存储' }
  ]

  /** 保存配置 */
  const onSave = async () => {
    try {
      await store.saveAudit()
      ElMessage.success('审计策略已保存')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    }
  }
</script>

<style lang="scss" scoped>
  .audit-panel {
    padding-right: 4px;
  }

  .au-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;

    .au-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .au-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .au-desc {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .au-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .au-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;

    .au-info {
      flex: 1;
      min-width: 0;
    }

    .au-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--art-text-gray-900);
    }

    .au-tip {
      margin-top: 2px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    .au-num {
      width: 140px;
    }

    .au-suffix {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .au-save-bar {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
</style>
