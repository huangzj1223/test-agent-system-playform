/**
 * 长期记忆建议工具接入层
 *
 * 给智能体提供「把用户在对话中透露的、值得长期记住的事实/偏好，提交为待确认记忆」的能力。
 * 与 nav-tools 同为全局注册（聊天面板挂载时注册一次，跨页面存活）。
 *
 * 关键约束（避免"假记忆"）：
 * - 本工具只把建议入队到「待确认记忆」，不直接写入任何记忆文件；
 * - 真正追加到 user.md/memory.md 等，需管理员在记忆中心逐条确认（届时过安全策略）；
 * - 因此工具成功回执须明确告知模型"已提交待确认、等待管理员审批后生效"，
 *   模型据此如实回复用户，不得谎称"已记住/已保存"。
 */
import { registerActions, type FrontendAction, type ActionResult } from '@/agent/frontend-action-registry'
import { createPendingMemory } from '@/api/agentMemory'

/** 允许模型建议写入的内置记忆文件（与后端 canSuggest 门控一致，仅作模型选型指引） */
const SUGGEST_TARGETS: Array<{ key: string; usage: string }> = [
  { key: 'user.md', usage: '用户个人信息：姓名、角色/职位、身份、称呼、沟通与工作偏好' },
  { key: 'memory.md', usage: '通用事实、约定、需长期记住的项目信息' },
  { key: 'soul.md', usage: '智能体自身的身份/行为准则（用户希望调整“你”的工作方式时）' },
  { key: 'skill-memory.md', usage: 'Skill（后端生成/页面操作等）使用经验与注意事项' },
  { key: 'tool-memory.md', usage: 'CLI/工具调用经验与命令模板' }
]

/** 当前记忆工具的注销函数 */
let disposeMemoryTools: (() => void) | null = null

/** 构建"提交待确认记忆建议"工具 */
function buildSuggestAction(): FrontendAction {
  const targetHint = SUGGEST_TARGETS.map((t) => `${t.key}（${t.usage}）`).join('；')
  return {
    name: 'memory.suggest',
    description:
      '当用户在对话中透露了值得【长期记住】的个人信息或偏好（如"我叫福星""我是系统管理员""以后用中文回复我"），' +
      '或明确要求你"记住"某件事时，调用本工具提交一条待确认记忆。' +
      '注意：本工具只是提交建议入队，需管理员在「记忆中心」确认后才会真正写入并在后续对话生效——' +
      `不要向用户谎称已立即记住。目标文件按内容选择：${targetHint}。默认个人信息填 user.md。`,
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '要记住的一句话事实或偏好，简洁、第三人称陈述，如"用户姓名为福星，角色是系统管理员"'
        },
        targetKey: {
          type: 'string',
          description: `目标记忆文件 key，个人信息用 user.md。可选：${SUGGEST_TARGETS.map((t) => t.key).join(' / ')}`
        },
        source: {
          type: 'string',
          description: '来源说明（可选），如"来自对话：用户自述身份"'
        }
      },
      required: ['text', 'targetKey']
    },
    riskLevel: 'low',
    requireConfirmation: false,
    execute: async (args: Record<string, unknown>): Promise<ActionResult> => {
      const text = typeof args.text === 'string' ? args.text.trim() : ''
      const targetKey = typeof args.targetKey === 'string' ? args.targetKey.trim() : ''
      const source = typeof args.source === 'string' ? args.source.trim() : undefined
      if (!text) {
        return { success: false, action: 'memory.suggest', message: '建议内容不能为空' }
      }
      if (!targetKey) {
        return {
          success: false,
          action: 'memory.suggest',
          message: `请指定目标记忆文件（如 user.md）。可选：${SUGGEST_TARGETS.map((t) => t.key).join(' / ')}`
        }
      }
      try {
        const res = await createPendingMemory(text, targetKey, source)
        return {
          success: true,
          action: 'memory.suggest',
          // 明确"待确认"语义，供模型如实转述给用户，杜绝"已记住"的假回复
          message: `已提交待确认记忆到「${targetKey}」，需管理员在记忆中心确认后才会生效。请如实告知用户"建议已提交、待审批"，不要说已经记住。`,
          data: res.data
        }
      } catch (e) {
        return {
          success: false,
          action: 'memory.suggest',
          message: (e as Error)?.message || '提交记忆建议失败'
        }
      }
    }
  }
}

/** 注册全局记忆建议工具（聊天面板挂载时调用一次；重复调用会先注销旧的） */
export function registerMemoryTools(): void {
  disposeMemoryTools?.()
  disposeMemoryTools = registerActions([buildSuggestAction()])
}

/** 注销记忆建议工具（一般无需手动调用） */
export function clearMemoryTools(): void {
  disposeMemoryTools?.()
  disposeMemoryTools = null
}
