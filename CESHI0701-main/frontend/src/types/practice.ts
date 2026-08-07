/**
 * 练习管理类型定义
 */

/**
 * 练习类型枚举
 */
export enum PracticeTypeEnum {
  /** 自主练习 */
  SELF = 1,
  /** 指派练习 */
  ASSIGNED = 2
}

/**
 * 练习状态枚举
 */
export enum PracticeStatusEnum {
  /** 停用 */
  DISABLED = 0,
  /** 启用 */
  ENABLED = 1
}

/**
 * 完成状态枚举
 */
export enum CompletionStatusEnum {
  /** 未完成 */
  INCOMPLETE = 0,
  /** 已完成 */
  COMPLETED = 1
}

/**
 * 抽题规则（按题型）
 */
export interface DrawRuleByType {
  /** 题型 */
  questionType: number
  /** 题型名称 */
  questionTypeName?: string
  /** 抽题数量 */
  count: number
  /** 每题分值 */
  score: number
}

/**
 * 抽题规则配置
 */
export interface DrawRuleConfig {
  /** 按题型抽题规则 */
  rules: DrawRuleByType[]
}

/**
 * 练习信息
 */
export interface Practice {
  /** 练习ID */
  id: number
  /** 练习名称 */
  name: string
  /** 练习类型 */
  type: PracticeTypeEnum
  /** 题库ID列表 */
  bankIds: number[]
  /** 题库名称列表 */
  bankNames?: string[]
  /** 练习说明 */
  description?: string
  /** 每次题量 */
  questionCount: number
  /** 抽题规则配置 */
  drawRuleConfig?: DrawRuleConfig
  /** 是否限时 */
  isTimeLimited: number
  /** 时长（分钟） */
  duration?: number
  /** 显示答案 */
  showAnswer: number
  /** 显示解析 */
  showAnalysis: number
  /** 允许重做 */
  allowRetry: number
  /** 必须完成次数 */
  requiredTimes?: number
  /** 完成截止时间 */
  deadline?: string
  /** 指派考生ID列表 */
  studentIds?: number[]
  /** 创建人ID */
  creatorId: number
  /** 创建人姓名 */
  creatorName?: string
  /** 创建时间 */
  createTime: string
  /** 状态 */
  status: PracticeStatusEnum
}

/**
 * 练习查询参数
 */
export interface PracticeParams {
  /** 练习名称 */
  name?: string
  /** 练习类型 */
  type?: number | string | null
  /** 状态 */
  status?: number | string | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 练习记录
 */
export interface PracticeRecord {
  /** 记录ID */
  id: number
  /** 练习ID */
  practiceId: number
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName: string
  /** 所属单位 */
  unitName: string
  /** 得分 */
  score: number
  /** 满分 */
  fullScore: number
  /** 正确率 */
  accuracy: number
  /** 用时（秒） */
  duration: number
  /** 开始时间 */
  startTime: string
  /** 完成时间 */
  finishTime: string
}

/**
 * 练习统计
 */
export interface PracticeStatistics {
  /** 练习ID */
  practiceId: number
  /** 练习名称 */
  practiceName: string
  /** 参与人数 */
  participantCount: number
  /** 完成人数 */
  completedCount: number
  /** 未完成人数 */
  incompleteCount: number
  /** 平均得分 */
  averageScore: number
  /** 最高分 */
  highestScore: number
  /** 最低分 */
  lowestScore: number
  /** 平均正确率 */
  averageAccuracy: number
  /** 题目正确率排行 */
  questionAccuracy: Array<{
    /** 题目ID */
    questionId: number
    /** 题目内容 */
    content: string
    /** 正确率 */
    accuracy: number
    /** 答题人数 */
    answerCount: number
  }>
  /** 考生完成情况 */
  studentCompletion: Array<{
    /** 考生ID */
    studentId: number
    /** 考生姓名 */
    studentName: string
    /** 所属单位 */
    unitName: string
    /** 完成次数 */
    completionCount: number
    /** 最高分 */
    highestScore: number
    /** 最近练习时间 */
    lastPracticeTime: string
  }>
}

/**
 * 学员进度
 */
export interface StudentProgress {
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName: string
  /** 所属单位 */
  unitName: string
  /** 完成次数 */
  completionCount: number
  /** 必须完成次数 */
  requiredTimes: number
  /** 最高分 */
  highestScore: number
  /** 最近练习时间 */
  lastPracticeTime?: string
  /** 完成状态 */
  completionStatus: CompletionStatusEnum
  /** 练习记录列表 */
  records?: PracticeRecord[]
}

/**
 * 学员进度查询参数
 */
export interface StudentProgressParams {
  /** 练习ID */
  practiceId: number
  /** 完成状态 */
  completionStatus?: number | string | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}
