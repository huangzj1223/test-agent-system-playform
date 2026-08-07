/**
 * 题库管理类型定义
 */

/**
 * 题库状态枚举
 */
export enum QuestionBankStatus {
  /** 停用 */
  DISABLED = 0,
  /** 启用 */
  ENABLED = 1
}

/**
 * 题库接口
 */
export interface QuestionBank {
  /** 题库ID */
  id: number
  /** 题库名称 */
  name: string
  /** 题库编码 */
  code?: string
  /** 题库说明 */
  description?: string
  /** 题目数量 */
  questionCount: number
  /** 排序号 */
  sort: number
  /** 状态 */
  status: number
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime: string
}

/**
 * 题库查询参数
 */
export interface QuestionBankListParams {
  /** 题库名称 */
  name?: string
  /** 状态 */
  status?: number | string | null
  /** 日期范围 */
  dateRange?: [Date, Date] | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 题目选项
 */
export interface QuestionOption {
  /** 选项标识 A, B, C, D, E, F */
  id: string
  /** 选项内容 */
  content: string
  /** 排序 */
  order: number
}

/**
 * 题目
 */
export interface Question {
  /** 题目ID */
  id: number
  /** 所属题库ID */
  bankId: number
  /** 题型 1-单选，2-多选，3-判断，4-填空，5-简答 */
  type: number
  /** 题干内容 */
  content: string
  /** 选项列表（单选/多选题） */
  options: QuestionOption[]
  /** 正确答案 */
  answer: string | string[]
  /** 答案解析 */
  analysis?: string
  /** 难度 1-简单，2-中等，3-困难 */
  difficulty: number
  /** 分值 */
  score: number
  /** 标签 */
  tags?: string
  /** 知识点 */
  knowledge?: string
  /** 引用次数 */
  refCount: number
  /** 状态 */
  status: number
  /** 创建人 */
  createBy?: string
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime: string
}

/**
 * 题型枚举
 */
export enum QuestionType {
  /** 单选题 */
  SINGLE_CHOICE = 1,
  /** 多选题 */
  MULTIPLE_CHOICE = 2,
  /** 判断题 */
  TRUE_FALSE = 3,
  /** 填空题 */
  FILL_BLANK = 4,
  /** 简答题 */
  SHORT_ANSWER = 5
}

/**
 * 难度枚举
 */
export enum Difficulty {
  /** 简单 */
  EASY = 1,
  /** 中等 */
  MEDIUM = 2,
  /** 困难 */
  HARD = 3
}

/**
 * 题目列表查询参数
 */
export interface QuestionListParams {
  /** 所属题库ID */
  bankId: number
  /** 关键词 */
  keyword?: string
  /** 题型 */
  type?: number | string | null
  /** 难度 */
  difficulty?: number | string | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}
