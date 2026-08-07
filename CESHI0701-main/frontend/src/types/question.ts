/**
 * 题目管理类型定义
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
 * 难度枚举
 */
export enum DifficultyLevel {
  /** 易 */
  EASY = 1,
  /** 中 */
  MEDIUM = 2,
  /** 难 */
  HARD = 3
}

/**
 * 题目状态枚举
 */
export enum QuestionStatus {
  /** 停用 */
  DISABLED = 0,
  /** 启用 */
  ENABLED = 1
}

/**
 * 选项接口
 */
export interface QuestionOption {
  /** 选项标识（A/B/C/D...） */
  label: string
  /** 选项内容 */
  content: string
}

/**
 * 题目接口
 */
export interface Question {
  /** 题目ID */
  id: number
  /** 题库ID */
  bankId: number
  /** 题型 */
  type: QuestionType
  /** 题干内容 */
  content: string
  /** 选项列表（选择题使用） */
  options?: QuestionOption[]
  /** 正确答案 */
  answer: string
  /** 答案解析 */
  analysis?: string
  /** 难度 */
  difficulty: DifficultyLevel
  /** 状态 */
  status: QuestionStatus
  /** 知识点标签 */
  tags?: string[]
  /** 参考答案（简答题使用） */
  referenceAnswer?: string
  /** 评分标准（简答题使用） */
  scoringCriteria?: string
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime: string
  /** 是否被试卷引用 */
  isReferenced?: boolean
}

/**
 * 题目查询参数
 */
export interface QuestionQueryParams {
  /** 题库ID */
  bankId: number
  /** 题型 */
  type?: QuestionType
  /** 难度 */
  difficulty?: DifficultyLevel
  /** 关键词 */
  keyword?: string
  /** 状态 */
  status?: QuestionStatus
  /** 创建时间范围 - 开始 */
  createTimeStart?: string
  /** 创建时间范围 - 结束 */
  createTimeEnd?: string
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 题目添加/编辑参数
 */
export interface QuestionFormData {
  /** 题目ID（编辑时使用） */
  id?: number
  /** 题库ID */
  bankId: number
  /** 题型 */
  type: QuestionType
  /** 题干内容 */
  content: string
  /** 选项列表 */
  options?: QuestionOption[]
  /** 正确答案 */
  answer: string
  /** 答案解析 */
  analysis?: string
  /** 难度 */
  difficulty: DifficultyLevel
  /** 状态 */
  status: QuestionStatus
  /** 知识点标签 */
  tags?: string[]
  /** 参考答案（简答题） */
  referenceAnswer?: string
  /** 评分标准（简答题） */
  scoringCriteria?: string
}

/**
 * 批量操作参数
 */
export interface QuestionBatchParams {
  /** 题目ID列表 */
  ids: number[]
  /** 操作类型 */
  action: 'status' | 'difficulty' | 'delete'
  /** 状态值（修改状态时使用） */
  status?: QuestionStatus
  /** 难度值（修改难度时使用） */
  difficulty?: DifficultyLevel
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failCount: number
  /** 失败详情 */
  failDetails?: Array<{
    row: number
    reason: string
  }>
}
