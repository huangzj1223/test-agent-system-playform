/**
 * 题库管理模块类型定义
 */

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
 * 难度等级枚举
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
 * 状态枚举
 */
export enum Status {
  /** 停用 */
  DISABLED = 0,
  /** 启用 */
  ENABLED = 1
}

/**
 * 题库数据类型
 */
export interface QuestionBank {
  /** 题库ID */
  id: number
  /** 题库名称 */
  name: string
  /** 所属单位ID */
  unitId: number
  /** 所属单位名称 */
  unitName?: string
  /** 题库说明 */
  description?: string
  /** 题目数量 */
  questionCount: number
  /** 创建人ID */
  creatorId: number
  /** 创建人姓名 */
  creatorName?: string
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime: string
  /** 状态 1-启用 0-停用 */
  status: number
}

/**
 * 题库列表查询参数
 */
export interface BankListParams {
  /** 题库名称 */
  name?: string
  /** 所属单位ID */
  unitId?: number | string | null
  /** 状态 */
  status?: number | string | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 题目选项类型
 */
export interface QuestionOption {
  /** 选项标识 A/B/C/D */
  label: string
  /** 选项内容 */
  content: string
}

/**
 * 题目数据类型
 */
export interface Question {
  /** 题目ID */
  id: number
  /** 题库ID */
  bankId: number
  /** 题库名称 */
  bankName?: string
  /** 题目类型 1-单选 2-多选 3-判断 4-填空 5-简答 */
  type: number
  /** 题目类型名称 */
  typeName?: string
  /** 题目内容 */
  content: string
  /** 题目分类ID */
  categoryId: number
  /** 题目分类名称 */
  categoryName?: string
  /** 难度等级 1-简单 2-中等 3-困难 */
  difficulty: number
  /** 难度等级名称 */
  difficultyName?: string
  /** 分值 */
  score: number
  /** 选项内容(选择题) */
  options?: QuestionOption[]
  /** 正确答案 */
  answer: string
  /** 答案解析 */
  analysis?: string
  /** 创建人ID */
  creatorId: number
  /** 创建人姓名 */
  creatorName?: string
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime: string
  /** 状态 1-启用 0-停用 */
  status: number
}

/**
 * 题目列表查询参数
 */
export interface QuestionListParams {
  /** 题库ID */
  bankId: number
  /** 题目内容 */
  content?: string
  /** 题目类型 */
  type?: number | string | null
  /** 难度等级 */
  difficulty?: number | string | null
  /** 状态 */
  status?: number | string | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}
