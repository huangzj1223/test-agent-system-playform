/**
 * 试卷管理模块类型定义
 */

/**
 * 组卷模式枚举
 */
export enum PaperMode {
  /** 固定试卷 */
  FIXED = 1,
  /** 随机试卷 */
  RANDOM = 2
}

/**
 * 试卷类型枚举(兼容旧代码)
 */
export enum PaperTypeEnum {
  /** 固定试卷 */
  FIXED = 1,
  /** 随机试卷 */
  RANDOM = 2
}

/**
 * 试卷状态枚举
 */
export enum PaperStatusEnum {
  /** 停用 */
  DISABLED = 0,
  /** 启用 */
  ENABLED = 1
}

/**
 * 题型枚举
 */
export enum QuestionTypeEnum {
  /** 单选题 */
  SINGLE = 1,
  /** 多选题 */
  MULTIPLE = 2,
  /** 判断题 */
  JUDGE = 3,
  /** 填空题 */
  FILL = 4,
  /** 简答题 */
  ESSAY = 5
}

/**
 * 难度枚举
 */
export enum DifficultyEnum {
  /** 简单 */
  EASY = 1,
  /** 中等 */
  MEDIUM = 2,
  /** 困难 */
  HARD = 3
}

/**
 * 排序方式枚举
 */
export enum SortTypeEnum {
  /** 随机排序 */
  RANDOM = 1,
  /** 按难度排序 */
  DIFFICULTY = 2,
  /** 按创建时间排序 */
  CREATE_TIME = 3
}

/**
 * 试卷基本信息
 */
export interface Paper {
  /** 试卷ID */
  id: number
  /** 试卷名称 */
  name: string
  /** 组卷模式 1-固定试卷 2-随机试卷 */
  mode: number
  /** 组卷模式名称 */
  modeName?: string
  /** 试卷说明 */
  description?: string
  /** 及格分数 */
  passScore: number
  /** 总题数 */
  questionCount: number
  /** 总分 */
  totalScore: number
  /** 题目配置(JSON) */
  questionConfig?: any
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
  /** 引用次数 */
  usedCount?: number
}

/**
 * 试卷列表查询参数
 */
export interface PaperListParams {
  /** 试卷名称 */
  name?: string
  /** 组卷模式 */
  mode?: number | string | null
  /** 状态 */
  status?: number | string | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 固定试卷大题
 */
export interface PaperSection {
  /** 大题ID */
  id: number
  /** 试卷ID */
  paperId: number
  /** 大题名称 */
  name: string
  /** 大题序号 */
  order: number
  /** 大题分值 */
  score: number
  /** 题目数量 */
  questionCount: number
}

/**
 * 固定试卷题目
 */
export interface PaperQuestion {
  /** 记录ID */
  id: number
  /** 试卷ID */
  paperId: number
  /** 大题ID */
  sectionId: number
  /** 题目ID */
  questionId: number
  /** 题目序号 */
  order: number
  /** 题目分值 */
  score: number
  /** 题型 */
  type?: QuestionTypeEnum
  /** 题干 */
  content?: string
  /** 难度 */
  difficulty?: DifficultyEnum
  /** 选项（选择题） */
  options?: string[]
  /** 正确答案 */
  answer?: string | string[]
  /** 答案解析 */
  analysis?: string
}

/**
 * 随机试卷抽题规则
 */
export interface PaperRule {
  /** 规则ID */
  id: number
  /** 试卷ID */
  paperId: number
  /** 题库分类ID */
  categoryId: number
  /** 题库分类名称 */
  categoryName?: string
  /** 题型 */
  type: QuestionTypeEnum
  /** 难度 */
  difficulty?: DifficultyEnum
  /** 抽取数量 */
  count: number
  /** 每题分值 */
  score: number
  /** 排序方式 */
  sortType: SortTypeEnum
  /** 规则序号 */
  order: number
}

/**
 * 试卷预览 - 题目选项
 */
export interface PaperPreviewOption {
  /** 选项ID */
  id: string
  /** 选项内容 */
  content: string
  /** 是否正确答案 */
  isCorrect: boolean
}

/**
 * 试卷预览 - 题目
 */
export interface PaperPreviewQuestion {
  /** 题目序号 */
  order: number
  /** 题型 */
  type: QuestionTypeEnum
  /** 题干 */
  content: string
  /** 选项（选择题） */
  options?: PaperPreviewOption[]
  /** 正确答案 */
  answer: string
  /** 答案解析 */
  analysis: string
  /** 分值 */
  score: number
}

/**
 * 试卷预览 - 大题
 */
export interface PaperPreviewSection {
  /** 大题名称 */
  name: string
  /** 题目列表 */
  questions: PaperPreviewQuestion[]
  /** 大题分值 */
  score: number
  /** 题目数量 */
  questionCount: number
}

/**
 * 试卷预览数据
 */
export interface PaperPreview {
  /** 试卷ID */
  id: number
  /** 试卷名称 */
  name: string
  /** 试卷类型 */
  type: PaperTypeEnum
  /** 试卷说明 */
  description: string
  /** 总分 */
  totalScore: number
  /** 题目数量 */
  questionCount: number
  /** 大题列表（固定试卷） */
  sections?: PaperPreviewSection[]
  /** 题目列表（随机试卷，扁平结构） */
  questions?: PaperPreviewQuestion[]
  /** 是否随机试卷样例 */
  isRandomSample?: boolean
}
