/**
 * 当前页面上下文（Page Context）
 *
 * 页面组件挂载时提供一个"上下文快照函数"，发送聊天消息时把结构化上下文
 * 随 forwardedProps 传给智能体，让模型理解用户当前所在场景与可用操作。
 * 只传结构化摘要，绝不传整页 HTML。
 */
import { ref } from 'vue'

/** 可见列定义 */
export interface PageContextColumn {
  key: string
  title: string
  dataType?: string
}

/** 结构化页面上下文 */
export interface PageContext {
  /** 页面标识（如 organization.department） */
  pageId: string
  /** 当前路由 */
  route: string
  /** 页面标题 */
  pageTitle: string
  /** 所属模块 */
  module: string
  /** 当前页面已注册的可用操作名 */
  availableActions: string[]
  /** 当前筛选条件 */
  filters: Record<string, unknown>
  /** 选中行 ID */
  selectedRowIds: string[]
  /** 展开行 ID */
  expandedRowIds: string[]
  /** 分页信息 */
  pagination: { page: number; pageSize: number; total: number }
  /** 可见列 */
  visibleColumns: PageContextColumn[]
  /**
   * 当前列表的行摘要（仅关键字段），供模型把用户口中的名称解析为 ID。
   * 只放少量结构化字段，绝不放整页数据/HTML。
   */
  rows?: Array<Record<string, unknown>>
  /** 当前用户在本页的权限点 */
  permissions: string[]
}

/** 上下文提供者：页面注册的快照函数，返回当前实时上下文 */
export type PageContextProvider = () => PageContext

/** 当前页面注册的上下文提供者（同一时刻仅一个业务页面处于活动态） */
const provider = ref<PageContextProvider | null>(null)

/**
 * 页面注册上下文提供者。
 * @param fn 返回实时页面上下文的函数
 * @returns 注销函数
 */
export function setPageContextProvider(fn: PageContextProvider): () => void {
  provider.value = fn
  return () => {
    if (provider.value === fn) provider.value = null
  }
}

/** 获取当前页面上下文快照；无页面注册时返回 null */
export function getPageContext(): PageContext | null {
  try {
    return provider.value ? provider.value() : null
  } catch {
    return null
  }
}

/** 是否有页面注册了上下文（供 UI 判断） */
export function hasPageContext(): boolean {
  return provider.value !== null
}
