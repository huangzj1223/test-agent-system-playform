/**
 * 智能体安全策略 Store
 * 维护风险等级、全局策略、审批规则、沙箱策略、黑白名单、敏感词、审计策略状态。
 * 数据来自后端 /admin/security-policy，各 action 调 API 成功后刷新对应切片。
 * 首次进入调 init() 拉 overview；mock 工厂仅作拉取前的占位初值。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createRiskPolicies,
  createGlobalPolicy,
  createApprovalRules,
  createSandboxPolicy,
  createBlackWhiteList,
  createSensitiveRules,
  createSensitiveStats,
  createAuditPolicy
} from '@/components/core/layouts/art-agent-chat/widget/security-policy/mockSecurityPolicies'
import type {
  RiskLevelPolicy,
  ApprovalRule,
  SensitiveRule,
  ListItem,
  GlobalPolicy,
  SandboxPolicy,
  AuditPolicy
} from '@/components/core/layouts/art-agent-chat/widget/security-policy/types'
import * as api from '@/api/agentSecurity'

/** 黑白名单区键名 → 后端 listType 映射 */
type ListKey = 'commandWhitelist' | 'commandBlacklist' | 'dirWhitelist' | 'apiDbBlacklist'
const LIST_KEY_TO_TYPE: Record<ListKey, api.ListType> = {
  commandWhitelist: 'command_white',
  commandBlacklist: 'command_black',
  dirWhitelist: 'dir_white',
  apiDbBlacklist: 'api_db_black'
}

export const useAgentSecurityStore = defineStore('agentSecurity', () => {
  const riskPolicies = ref<RiskLevelPolicy[]>(createRiskPolicies())
  const globalPolicy = ref<GlobalPolicy>(createGlobalPolicy())
  const approvalRules = ref<ApprovalRule[]>(createApprovalRules())
  const sandbox = ref<SandboxPolicy>(createSandboxPolicy())
  const blackWhiteList = ref(createBlackWhiteList())
  const sensitiveRules = ref<SensitiveRule[]>(createSensitiveRules())
  const sensitiveStats = ref(createSensitiveStats())
  const auditPolicy = ref<AuditPolicy>(createAuditPolicy())
  /** 是否已从后端加载 */
  const loaded = ref(false)

  /** 首次拉取全部安全策略（幂等，重复调用会刷新） */
  async function init(): Promise<void> {
    const res = await api.fetchSecurityOverview()
    const d = res.data
    if (!d) return
    // 顶层数组：面板在模板中直接读 store.xxx，替换 .value 即可保持响应式
    riskPolicies.value = d.riskPolicies
    approvalRules.value = d.approvalRules
    sensitiveRules.value = d.sensitiveRules
    // 以下对象/聚合被面板在 setup 中按引用捕获（如 const g = store.globalPolicy），
    // 必须就地合并而非替换整个引用，否则面板持有的旧引用不再响应式
    Object.assign(sensitiveStats.value, d.sensitiveStats)
    Object.assign(globalPolicy.value, d.global)
    Object.assign(auditPolicy.value, d.audit)
    mergeSandbox(d.sandbox)
    mergeBlackWhiteList(d.blackWhiteList)
    loaded.value = true
  }

  /** 就地合并沙箱各子配置（保持面板捕获的 cli/file/database/page 引用有效） */
  function mergeSandbox(next: SandboxPolicy): void {
    Object.assign(sandbox.value.cli, next.cli)
    Object.assign(sandbox.value.file, next.file)
    Object.assign(sandbox.value.database, next.database)
    Object.assign(sandbox.value.page, next.page)
  }

  /** 就地替换黑白名单四区数组（保持面板捕获的 blackWhiteList 对象引用有效） */
  function mergeBlackWhiteList(next: typeof blackWhiteList.value): void {
    blackWhiteList.value.commandWhitelist = next.commandWhitelist
    blackWhiteList.value.commandBlacklist = next.commandBlacklist
    blackWhiteList.value.dirWhitelist = next.dirWhitelist
    blackWhiteList.value.apiDbBlacklist = next.apiDbBlacklist
  }

  /* ---------- 风险等级 ---------- */

  /** 保存风险等级（按 level upsert），成功后刷新列表 */
  async function saveRiskPolicy(policy: RiskLevelPolicy): Promise<void> {
    await api.saveRiskPolicy(policy)
    riskPolicies.value = (await api.fetchRiskPolicies()).data ?? riskPolicies.value
  }

  /** 删除风险等级 */
  async function removeRiskPolicy(level: string): Promise<void> {
    await api.deleteRiskPolicy(level)
    riskPolicies.value = riskPolicies.value.filter((p) => p.level !== level)
  }

  /* ---------- 审批规则 ---------- */

  /** 保存审批规则（id 为 0/假值走新建，否则更新），成功后刷新列表 */
  async function saveApprovalRule(rule: ApprovalRule): Promise<void> {
    if (rule.id) {
      await api.updateApprovalRule(rule)
    } else {
      const { id: _omit, ...rest } = rule
      await api.addApprovalRule(rest)
    }
    approvalRules.value = (await api.fetchApprovalRules()).data ?? approvalRules.value
  }

  /** 删除审批规则 */
  async function removeApprovalRule(id: number): Promise<void> {
    await api.deleteApprovalRule(id)
    approvalRules.value = approvalRules.value.filter((r) => r.id !== id)
  }

  /** 切换审批规则启用状态 */
  async function toggleApprovalRule(id: number, enabled: boolean): Promise<void> {
    await api.toggleApprovalRule(id, enabled)
    const rule = approvalRules.value.find((r) => r.id === id)
    if (rule) rule.enabled = enabled
  }

  /* ---------- 黑白名单 ---------- */

  /** 保存名单条目（新建/更新），成功后刷新该区 */
  async function saveListItem(key: ListKey, item: ListItem): Promise<void> {
    const listType = LIST_KEY_TO_TYPE[key]
    if (item.id) {
      await api.updateListItem({ listType, ...item })
    } else {
      const { id: _omit, ...rest } = item
      await api.addListItem({ listType, ...rest })
    }
    blackWhiteList.value[key] = (await api.fetchListByType(listType)).data ?? blackWhiteList.value[key]
  }

  /** 删除名单条目 */
  async function removeListItem(key: ListKey, id: number): Promise<void> {
    await api.deleteListItem(id)
    blackWhiteList.value[key] = blackWhiteList.value[key].filter((i) => i.id !== id)
  }

  /** 切换名单条目启用状态 */
  async function toggleListItem(key: ListKey, id: number, enabled: boolean): Promise<void> {
    await api.toggleListItem(id, enabled)
    const item = blackWhiteList.value[key].find((i) => i.id === id)
    if (item) item.enabled = enabled
  }

  /* ---------- 敏感词 ---------- */

  /** 保存敏感词规则（新建/更新），成功后刷新列表与统计 */
  async function saveSensitiveRule(rule: SensitiveRule): Promise<void> {
    if (rule.id) {
      await api.updateSensitiveRule(rule)
    } else {
      const { id: _omit, ...rest } = rule
      await api.addSensitiveRule(rest)
    }
    await refreshSensitive()
  }

  /** 删除敏感词规则 */
  async function removeSensitiveRule(id: number): Promise<void> {
    await api.deleteSensitiveRule(id)
    await refreshSensitive()
  }

  /** 切换敏感词规则启用状态 */
  async function toggleSensitiveRule(id: number, enabled: boolean): Promise<void> {
    await api.toggleSensitiveRule(id, enabled)
    await refreshSensitive()
  }

  /** 刷新敏感词列表与统计 */
  async function refreshSensitive(): Promise<void> {
    const [list, stats] = await Promise.all([api.fetchSensitiveRules(), api.fetchSensitiveStats()])
    if (list.data) sensitiveRules.value = list.data
    if (stats.data) sensitiveStats.value = stats.data
  }

  /* ---------- 全局 / 沙箱 / 审计 ---------- */

  /** 保存全局策略（就地合并返回值，保持面板引用有效） */
  async function saveGlobal(): Promise<void> {
    const res = await api.saveGlobalPolicy(globalPolicy.value)
    if (res.data) Object.assign(globalPolicy.value, res.data)
  }

  /** 保存沙箱策略（就地合并返回值） */
  async function saveSandbox(): Promise<void> {
    const res = await api.saveSandboxPolicy(sandbox.value)
    if (res.data) mergeSandbox(res.data)
  }

  /** 保存审计策略（就地合并返回值） */
  async function saveAudit(): Promise<void> {
    const res = await api.saveAuditPolicy(auditPolicy.value)
    if (res.data) Object.assign(auditPolicy.value, res.data)
  }

  return {
    riskPolicies,
    globalPolicy,
    approvalRules,
    sandbox,
    blackWhiteList,
    sensitiveRules,
    sensitiveStats,
    auditPolicy,
    loaded,
    init,
    saveRiskPolicy,
    removeRiskPolicy,
    saveApprovalRule,
    removeApprovalRule,
    toggleApprovalRule,
    saveListItem,
    removeListItem,
    toggleListItem,
    saveSensitiveRule,
    removeSensitiveRule,
    toggleSensitiveRule,
    saveGlobal,
    saveSandbox,
    saveAudit
  }
})
