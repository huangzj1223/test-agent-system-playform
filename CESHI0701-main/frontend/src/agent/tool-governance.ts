/**
 * 工具治理同步层
 *
 * 打通「前端注册表」与后端「工具权限」页两套系统：
 * - 上报：把当前注册表里真实可调用的工具清单同步到后端 sys_agent_tool（幂等 upsert），
 *   使导航/记忆/技能/网页等真实工具出现在「工具权限」页，可被查看与启停。
 * - 拉取：取回治理映射（启用/需确认），写入注册表门控——被禁用的工具不再下发给模型，
 *   被治理标记"需确认"的工具在执行前弹二次确认。
 *
 * 失败不抛出（不阻断聊天可用），仅静默保持上次状态。
 */
import { listAllActions, setToolGovernance, type FrontendAction } from '@/agent/frontend-action-registry'
import { syncRegistryTools, fetchToolGovernance, type RegistryToolItem } from '@/api/agentTool'

/** 注册表风险等级 → 后端治理等级（low/medium/high → L1/L2/L3） */
function toRiskLevel(risk: FrontendAction['riskLevel']): string {
  if (risk === 'high') return 'L3'
  if (risk === 'medium') return 'L2'
  return 'L1'
}

/** 按工具名前缀推断治理类型（缺省 page 页面操作） */
function inferType(action: FrontendAction): string {
  if (action.toolType) return action.toolType
  const name = action.name
  if (name.startsWith('web.')) return 'external'
  if (name === 'ui.openWeb') return 'browser'
  if (name.startsWith('ui.')) return 'page'
  if (name.startsWith('memory.')) return 'page'
  return 'page'
}

/** 把注册表操作转为上报项 */
function toRegistryItem(action: FrontendAction): RegistryToolItem {
  return {
    toolKey: action.name,
    name: action.name,
    type: inferType(action),
    description: action.description?.slice(0, 500),
    riskLevel: toRiskLevel(action.riskLevel),
    requireConfirm: action.requireConfirmation
  }
}

/**
 * 同步工具治理：上报当前注册表清单 → 拉取治理映射 → 写入注册表门控。
 * 应在聊天面板挂载、且全局工具（导航/记忆/网页/技能）均已注册后调用。
 */
export async function syncToolGovernance(): Promise<void> {
  try {
    const items = listAllActions().map(toRegistryItem)
    // 先上报（新工具入库、默认启用；已存在保留管理员启停），再拉治理映射
    if (items.length) await syncRegistryTools(items)
    const res = await fetchToolGovernance()
    setToolGovernance(res.data || {})
  } catch {
    // 拉取/上报失败：保留上次治理状态，不影响聊天基本使用（未治理默认放行）
  }
}

/**
 * 仅刷新治理映射（不重新上报清单）。
 * 供「工具权限」页开关/保存/删除后调用，使模型可见工具即时随治理变化。
 */
export async function refreshToolGovernance(): Promise<void> {
  try {
    const res = await fetchToolGovernance()
    setToolGovernance(res.data || {})
  } catch {
    // 刷新失败保留上次状态
  }
}
