/**
 * 考试管理类型定义
 */

/**
 * 考试状态枚举
 */
export enum ExamStatusEnum {
  /** 待考 */
  PENDING = 1,
  /** 进行中 */
  IN_PROGRESS = 2,
  /** 已结束 */
  FINISHED = 3,
  /** 已取消 */
  CANCELLED = 4
}

/**
 * 考试列表查询参数
 */
export interface ExamListParams {
  /** 考试名称 */
  name?: string
  /** 考试状态 */
  status?: number | string | null
  /** 开始时间 - 起始 */
  startTimeBegin?: string
  /** 开始时间 - 结束 */
  startTimeEnd?: string
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 切屏处理方式枚举
 */
export enum SwitchActionEnum {
  /** 警告 */
  WARNING = 1,
  /** 强制交卷 */
  FORCE_SUBMIT = 2
}

/**
 * 阅卷模式枚举
 */
export enum ReviewModeEnum {
  /** 按题目分配 */
  BY_QUESTION = 1,
  /** 按考生分配 */
  BY_STUDENT = 2
}

/**
 * 发证条件枚举
 */
export enum CertificateConditionEnum {
  /** 及格即发 */
  PASS = 1,
  /** 达到指定分数 */
  SCORE = 2
}

/**
 * 考试基本信息
 */
export interface Exam {
  /** 考试ID */
  id: number
  /** 考试名称 */
  name: string
  /** 考试说明 */
  description: string
  /** 考试类型 */
  type: string
  /** 关联试卷ID */
  paperId: number
  /** 试卷名称 */
  paperName: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 考试时长（分钟） */
  duration: number
  /** 切屏限制次数 */
  switchLimit: number
  /** 切屏处理方式 */
  switchAction: SwitchActionEnum
  /** 摄像头监控 */
  cameraMonitor: number
  /** 抓拍频率（分钟） */
  captureInterval: number
  /** 人脸识别 */
  faceRecognition: number
  /** 允许跳题 */
  allowSkip: number
  /** 显示导航 */
  showNavigation: number
  /** 立即显示成绩 */
  showScoreImmediately: number
  /** 显示答案解析 */
  showAnalysis: number
  /** 显示排名 */
  showRank: number
  /** 是否发证 */
  issueCertificate: number
  /** 证书模板ID */
  certificateTemplateId?: number
  /** 发证条件 */
  certificateCondition?: CertificateConditionEnum
  /** 发证分数 */
  certificateScore?: number
  /** 参考人数 */
  studentCount: number
  /** 已交卷人数 */
  submittedCount: number
  /** 及格人数 */
  passedCount: number
  /** 及格率 */
  passRate: number
  /** 平均分 */
  averageScore: number
  /** 最高分 */
  maxScore: number
  /** 最低分 */
  minScore: number
  /** 创建人ID */
  creatorId: number
  /** 创建人姓名 */
  creatorName: string
  /** 创建时间 */
  createTime: string
  /** 更新时间 */
  updateTime: string
  /** 考试状态 */
  status: ExamStatusEnum
}

/**
 * 考试规则配置
 */
export interface ExamRules {
  /** 允许跳题 */
  allowSkip: number
  /** 显示题目导航 */
  showNavigation: number
  /** 交卷后立即显示成绩 */
  showScoreImmediately: number
  /** 显示答案解析 */
  showAnalysis: number
  /** 允许查看排名 */
  showRank: number
}

/**
 * 防作弊设置
 */
export interface AntiCheatSettings {
  /** 切屏限制次数 */
  switchLimit: number
  /** 切屏处理方式 */
  switchAction: SwitchActionEnum
  /** 摄像头监控 */
  cameraMonitor: number
  /** 抓拍频率（分钟） */
  captureInterval: number
  /** 人脸识别 */
  faceRecognition: number
}

/**
 * 证书规则配置
 */
export interface CertificateRules {
  /** 是否颁发证书 */
  issueCertificate: number
  /** 证书模板ID */
  certificateTemplateId?: number
  /** 颁发条件 */
  certificateCondition?: CertificateConditionEnum
  /** 发证分数 */
  certificateScore?: number
}

/**
 * 考试参考人员
 */
export interface ExamStudent {
  /** 考生ID */
  id: number
  /** 考生姓名 */
  name: string
  /** 工号/学号 */
  code?: string
  /** 所属单位 */
  unitName?: string
  /** 手机号 */
  phone: string
  /** 邮箱 */
  email?: string
}

/**
 * 阅卷人信息
 */
export interface ExamReviewer {
  /** 用户ID */
  id: number
  /** 用户姓名 */
  name: string
  /** 阅卷模式 */
  mode: ReviewModeEnum
}

/**
 * 创建考试表单数据
 */
export interface ExamFormData {
  /** 考试名称 */
  name: string
  /** 考试说明 */
  description: string
  /** 考试类型 */
  type: string
  /** 关联试卷ID */
  paperId: number | null
  /** 试卷名称（用于显示） */
  paperName?: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime: string
  /** 考试时长（分钟） */
  duration: number
  /** 参考人员列表 */
  students: ExamStudent[]
  /** 阅卷人列表 */
  reviewers: ExamReviewer[]
  /** 考试规则 */
  rules: ExamRules
  /** 防作弊设置 */
  antiCheat: AntiCheatSettings
  /** 证书规则 */
  certificate: CertificateRules
}

/**
 * 考生状态枚举
 */
export enum StudentStatusEnum {
  /** 未开始 */
  NOT_STARTED = 0,
  /** 答题中 */
  ANSWERING = 1,
  /** 已交卷 */
  SUBMITTED = 2,
  /** 异常 */
  ABNORMAL = 3
}

/**
 * 监考看板概览数据
 */
export interface MonitorOverview {
  /** 考试名称 */
  examName: string
  /** 考试时间 */
  examTime: string
  /** 剩余时间（分钟） */
  remainingTime: number
  /** 未开始人数 */
  notStartedCount: number
  /** 答题中人数 */
  answeringCount: number
  /** 已交卷人数 */
  submittedCount: number
  /** 异常人数 */
  abnormalCount: number
}

/**
 * 考生监控数据
 */
export interface MonitorStudent {
  /** 考生ID */
  id: number
  /** 考生姓名 */
  name: string
  /** 所属单位 */
  unitName: string
  /** 考生状态 */
  status: StudentStatusEnum
  /** 答题进度（百分比） */
  progress: number
  /** 切屏次数 */
  switchCount: number
  /** 最后活跃时间 */
  lastActiveTime: string
  /** IP地址 */
  ipAddress: string
}

/**
 * 异常记录
 */
export interface MonitorException {
  /** 记录ID */
  id: number
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName: string
  /** 异常类型 */
  type: string
  /** 异常描述 */
  description: string
  /** 发生时间 */
  occurTime: string
  /** 处理状态：0-未处理，1-已处理 */
  handleStatus: number
}

/**
 * 摄像头抓拍照片
 */
export interface CapturePhoto {
  /** 照片ID */
  id: number
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName: string
  /** 照片URL */
  photoUrl: string
  /** 抓拍时间 */
  captureTime: string
}

/**
 * 成绩统计数据
 */
export interface ScoreStatistics {
  /** 参考人数 */
  totalCount: number
  /** 及格人数 */
  passCount: number
  /** 及格率（百分比） */
  passRate: number
  /** 平均分 */
  averageScore: number
  /** 最高分 */
  maxScore: number
  /** 最低分 */
  minScore: number
  /** 分数段分布 */
  scoreDistribution: {
    /** 分数段名称 */
    range: string
    /** 人数 */
    count: number
  }[]
}

/**
 * 考生成绩
 */
export interface StudentScore {
  /** 记录ID */
  id: number
  /** 排名 */
  rank: number
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName: string
  /** 所属单位 */
  unitName: string
  /** 总分 */
  totalScore: number
  /** 客观题得分 */
  objectiveScore: number
  /** 主观题得分 */
  subjectiveScore: number
  /** 正确率（百分比） */
  accuracy: number
  /** 答题用时（分钟） */
  duration: number
  /** 状态 */
  status: string
  /** 交卷时间 */
  submitTime: string
}

/**
 * 成绩查询参数
 */
export interface ScoreQueryParams {
  /** 考生姓名 */
  studentName?: string
  /** 所属单位 */
  unitName?: string
  /** 最低分 */
  minScore?: number
  /** 最高分 */
  maxScore?: number
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 答卷详情
 */
export interface AnswerDetail {
  /** 考生基本信息 */
  student: {
    id: number
    name: string
    unitName: string
    phone: string
  }
  /** 考试信息 */
  exam: {
    name: string
    startTime: string
    endTime: string
    duration: number
  }
  /** 成绩信息 */
  score: {
    totalScore: number
    objectiveScore: number
    subjectiveScore: number
    accuracy: number
    duration: number
  }
  /** 答题详情 */
  answers: {
    /** 题目ID */
    questionId: number
    /** 题目内容 */
    questionContent: string
    /** 题目类型 */
    questionType: string
    /** 考生答案 */
    studentAnswer: string
    /** 正确答案 */
    correctAnswer: string
    /** 得分 */
    score: number
    /** 是否正确 */
    isCorrect: boolean
    /** 答题时间 */
    answerTime: string
  }[]
  /** 异常行为记录 */
  exceptions: {
    /** 切屏记录 */
    switchRecords: {
      time: string
      count: number
    }[]
    /** 抓拍照片 */
    photos: {
      url: string
      time: string
    }[]
  }
}

/**
 * 统计分析数据
 */
export interface StatisticsData {
  /** 成绩分布图数据 */
  scoreDistribution: {
    range: string
    count: number
  }[]
  /** 题目正确率排行 */
  questionAccuracy: {
    questionId: number
    questionContent: string
    correctRate: number
    errorRate: number
  }[]
  /** 考生用时分布 */
  durationDistribution: {
    range: string
    count: number
  }[]
  /** 及格率趋势 */
  passRateTrend: {
    examName: string
    passRate: number
    date: string
  }[]
}
