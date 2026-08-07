/**
 * 阅卷管理类型定义
 */

/**
 * 阅卷模式枚举
 */
export enum ReviewModeEnum {
  /** 按题目批阅 */
  BY_QUESTION = 1,
  /** 按考生批阅 */
  BY_STUDENT = 2
}

/**
 * 阅卷状态枚举
 */
export enum ReviewStatusEnum {
  /** 待阅 */
  PENDING = 1,
  /** 阅卷中 */
  REVIEWING = 2,
  /** 已完成 */
  COMPLETED = 3
}

/**
 * 题目类型枚举
 */
export enum QuestionTypeEnum {
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
 * 阅卷任务
 */
export interface ReviewTask {
  /** 任务ID */
  id: number
  /** 考试ID */
  examId: number
  /** 考试名称 */
  examName: string
  /** 考试开始时间 */
  examStartTime: string
  /** 考试结束时间 */
  examEndTime: string
  /** 阅卷员ID */
  reviewerId: number
  /** 阅卷员姓名 */
  reviewerName: string
  /** 阅卷模式 */
  mode: ReviewModeEnum
  /** 待阅数量 */
  pendingCount: number
  /** 已阅数量 */
  reviewedCount: number
  /** 阅卷进度 */
  progress: number
  /** 分配时间 */
  assignTime: string
  /** 完成时间 */
  finishTime?: string
  /** 状态 */
  status: ReviewStatusEnum
}

/**
 * 阅卷任务查询参数
 */
export interface ReviewTaskParams {
  /** 考试名称 */
  examName?: string
  /** 考试开始时间 */
  startTime?: string
  /** 考试结束时间 */
  endTime?: string
  /** 阅卷状态 */
  status?: number | string | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 题目信息（用于按题目批阅）
 */
export interface ReviewQuestion {
  /** 题目ID */
  id: number
  /** 题号 */
  questionNo: number
  /** 题目类型 */
  type: QuestionTypeEnum
  /** 题目内容 */
  content: string
  /** 满分 */
  fullScore: number
  /** 标准答案 */
  answer: string
  /** 答案解析 */
  analysis?: string
  /** 待阅数量 */
  pendingCount: number
  /** 已阅数量 */
  reviewedCount: number
  /** 批阅进度 */
  progress: number
}

/**
 * 考生信息（用于按考生批阅）
 */
export interface ReviewStudent {
  /** 考生ID */
  id: number
  /** 考生姓名 */
  name: string
  /** 所属单位 */
  unitName: string
  /** 待阅数量 */
  pendingCount: number
  /** 已阅数量 */
  reviewedCount: number
  /** 批阅进度 */
  progress: number
}

/**
 * 考生答案（用于按题目批阅）
 */
export interface StudentAnswer {
  /** 记录ID */
  id: number
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName: string
  /** 所属单位 */
  unitName: string
  /** 考生答案 */
  answer: string
  /** 得分 */
  score?: number
  /** 评语 */
  comment?: string
  /** 批阅状态 */
  isReviewed: boolean
  /** 阅卷员姓名 */
  reviewerName?: string
  /** 阅卷时间 */
  reviewTime?: string
}

/**
 * 主观题答案（用于按考生批阅）
 */
export interface SubjectiveAnswer {
  /** 记录ID */
  id: number
  /** 题目ID */
  questionId: number
  /** 题号 */
  questionNo: number
  /** 题目类型 */
  type: QuestionTypeEnum
  /** 题目内容 */
  content: string
  /** 满分 */
  fullScore: number
  /** 标准答案 */
  answer: string
  /** 答案解析 */
  analysis?: string
  /** 考生答案 */
  studentAnswer: string
  /** 得分 */
  score?: number
  /** 评语 */
  comment?: string
  /** 批阅状态 */
  isReviewed: boolean
}

/**
 * 评分提交参数
 */
export interface SubmitScoreParams {
  /** 记录ID */
  id: number
  /** 考试ID */
  examId: number
  /** 考生ID */
  studentId: number
  /** 题目ID */
  questionId: number
  /** 得分 */
  score: number
  /** 评语 */
  comment?: string
}

/**
 * 批量评分提交参数（用于按考生批阅）
 */
export interface BatchSubmitScoreParams {
  /** 考试ID */
  examId: number
  /** 考生ID */
  studentId: number
  /** 评分列表 */
  scores: Array<{
    /** 记录ID */
    id: number
    /** 题目ID */
    questionId: number
    /** 得分 */
    score: number
    /** 评语 */
    comment?: string
  }>
}

/**
 * 阅卷进度统计
 */
export interface ReviewProgress {
  /** 考试ID */
  examId: number
  /** 考试名称 */
  examName: string
  /** 总题目数 */
  totalQuestions: number
  /** 已阅题目数 */
  reviewedQuestions: number
  /** 待阅题目数 */
  pendingQuestions: number
  /** 总考生数 */
  totalStudents: number
  /** 已阅考生数 */
  reviewedStudents: number
  /** 待阅考生数 */
  pendingStudents: number
  /** 阅卷员进度列表 */
  reviewers: Array<{
    /** 阅卷员ID */
    id: number
    /** 阅卷员姓名 */
    name: string
    /** 分配数量 */
    assignedCount: number
    /** 已阅数量 */
    reviewedCount: number
    /** 待阅数量 */
    pendingCount: number
    /** 阅卷进度 */
    progress: number
  }>
}

/**
 * 评语库项
 */
export interface CommentTemplate {
  /** ID */
  id: number
  /** 评语内容 */
  content: string
  /** 使用次数 */
  useCount: number
}
