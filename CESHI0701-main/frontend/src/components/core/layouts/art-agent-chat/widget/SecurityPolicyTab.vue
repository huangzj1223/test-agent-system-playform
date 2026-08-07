<!-- 安全策略：左侧分类导航 + 右侧对应配置面板动态切换 -->
<template>
  <div class="security-policy">
    <SecuritySideNav :active="active" @select="active = $event" />

    <div class="sp-content">
      <RiskLevelPolicyPanel v-if="active === 'risk'" />
      <ApprovalRulesPanel v-else-if="active === 'approval'" />
      <SandboxPolicyPanel v-else-if="active === 'sandbox'" />
      <BlackWhiteListPanel v-else-if="active === 'blacklist'" />
      <SensitivePolicyPanel v-else-if="active === 'sensitive'" />
      <AuditPolicyPanel v-else-if="active === 'audit'" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useAgentSecurityStore } from '@/store/modules/agentSecurity'
  import SecuritySideNav from './security-policy/SecuritySideNav.vue'
  import RiskLevelPolicyPanel from './security-policy/RiskLevelPolicyPanel.vue'
  import ApprovalRulesPanel from './security-policy/ApprovalRulesPanel.vue'
  import SandboxPolicyPanel from './security-policy/SandboxPolicyPanel.vue'
  import BlackWhiteListPanel from './security-policy/BlackWhiteListPanel.vue'
  import SensitivePolicyPanel from './security-policy/SensitivePolicyPanel.vue'
  import AuditPolicyPanel from './security-policy/AuditPolicyPanel.vue'
  import type { SecurityCategory } from './security-policy/types'

  defineOptions({ name: 'SecurityPolicyTab' })

  const store = useAgentSecurityStore()

  /** 当前激活分类（默认风险等级设置） */
  const active = ref<SecurityCategory>('risk')

  // 首次挂载从后端拉取全部安全策略（失败保留 mock 占位并提示）
  onMounted(async () => {
    try {
      await store.init()
    } catch (e) {
      ElMessage.error((e as Error)?.message || '安全策略加载失败')
    }
  })
</script>

<style lang="scss" scoped>
  .security-policy {
    display: flex;
    gap: 12px;
    height: 100%;
    min-height: 0;
  }

  .sp-content {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 16px 18px;
    overflow-y: auto;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }
</style>
