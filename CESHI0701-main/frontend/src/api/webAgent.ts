/**
 * 智能体网页读取 API
 * 对接后端 /admin/web-agent：用无头浏览器读取网页渲染后正文，供模型总结。
 */
import request from '@/utils/http'

/** 读取网页入参（site+keyword 或 url 二选一） */
export interface ReadPageParams {
  /** 站点白名单键（bilibili/baidu/taobao/zhihu/youtube） */
  site?: string
  /** 搜索关键词（配合 site） */
  keyword?: string
  /** 直接读取的完整 URL */
  url?: string
}

/** 读取结果 */
export interface ReadPageResult {
  /** 最终 URL（可能因重定向变化） */
  url: string
  /** 页面标题 */
  title: string
  /** 抽取的正文文本（已截断） */
  text: string
  /** 是否被截断 */
  truncated: boolean
}

/** 读取网页正文 */
export function readWebPage(params: ReadPageParams) {
  return request.post<ReadPageResult>({ url: '/admin/web-agent/read', data: params })
}
