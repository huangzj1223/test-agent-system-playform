/**
 * 前端工具注册表
 * 供 Agent 通过 AG-UI 调用的安全前端工具集合。
 * 安全边界：不提供任意 JS 执行、任意接口请求或任意 DOM 操作；
 * 涉及数据增删改的工具必须声明 confirmationRequired，由调用方在执行前二次确认。
 *
 * ⚠️ 接线状态：本注册表为「前端工具执行」能力的基础设施，当前 mock 阶段后端
 * 以 TOOL_CALL_* 事件演示工具调用可视化，尚未把事件路由到此处真正执行前端工具、
 * 再将结果回传 Agent（该闭环需真实 Agent 协同）。接入真实 Agent 时，在
 * useAgUiAgent 的 onEvent 中监听 TOOL_CALL_END，按 name 调用 getFrontendTool()
 * 执行（confirmationRequired 者先弹确认），并以新的 run 回传工具结果。
 */
import { router } from '@/router'

/** 工具执行结果 */
export interface FrontendToolResult {
  /** 是否成功 */
  ok: boolean
  /** 结果数据（将被序列化为工具结果文本） */
  data?: unknown
  /** 错误信息 */
  error?: string
}

/** 前端工具定义 */
export interface FrontendTool {
  /** 工具名称（与后端 Agent 约定一致） */
  name: string
  /** 工具描述 */
  description: string
  /** 参数 JSON Schema（供 Agent 生成参数） */
  parameters: Record<string, unknown>
  /** 执行是否需要用户确认（涉及数据变更时为 true） */
  confirmationRequired: boolean
  /** 执行处理器 */
  handler: (args: Record<string, unknown>) => Promise<FrontendToolResult> | FrontendToolResult
}

/**
 * 演示工具：获取当前页面上下文（只读，无副作用）
 * 返回当前路由、页面名称、模块信息，供 Agent 理解用户所在场景。
 */
const getCurrentPageContext: FrontendTool = {
  name: 'get_current_page_context',
  description: '获取当前页面的路由、页面名称与所属模块（只读，不修改任何数据）',
  parameters: {
    type: 'object',
    properties: {
      withSelection: { type: 'boolean', description: '是否包含当前选中数据摘要' }
    }
  },
  confirmationRequired: false,
  handler: () => {
    const route = router.currentRoute.value
    return {
      ok: true,
      data: {
        path: route.path,
        name: (route.name as string) || '',
        title: (route.meta?.title as string) || '',
        module: route.path.split('/').filter(Boolean)[0] || ''
      }
    }
  }
}

/** 工具注册表：name -> 工具 */
const registry: Record<string, FrontendTool> = {
  [getCurrentPageContext.name]: getCurrentPageContext
}

/** 获取全部已注册工具 */
export function listFrontendTools(): FrontendTool[] {
  return Object.values(registry)
}

/** 按名称获取工具 */
export function getFrontendTool(name: string): FrontendTool | undefined {
  return registry[name]
}
