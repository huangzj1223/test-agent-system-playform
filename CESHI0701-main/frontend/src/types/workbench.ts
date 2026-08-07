/**
 * 工作台相关类型定义
 */

/**
 * 核心指标统计
 */
export interface WorkbenchStats {
  /** 考试场次统计 */
  examCount: {
    /** 总考试场次 */
    total: number
    /** 本月考试场次 */
    thisMonth: number
  }
  /** 参考人数统计 */
  participantCount: {
    /** 总参考人数 */
    total: number
    /** 本月参考人数 */
    thisMonth: number
  }
  /** 通过率统计 */
  passRate: {
    /** 平均通过率 */
    average: number
    /** 本月通过率 */
    thisMonth: number
  }
  /** 题库统计 */
  questionBank: {
    /** 题库总数 */
    bankCount: number
    /** 题目总数 */
    questionCount: number
  }
}

/**
 * 考试趋势数据点
 */
export interface ExamTrendPoint {
  /** 日期 */
  date: string
  /** 考试场次 */
  examCount: number
  /** 参考人数 */
  participantCount: number
  /** 通过率 */
  passRate: number
}

/**
 * 考试趋势数据
 */
export interface ExamTrend {
  /** 时间范围（天数） */
  days: number
  /** 趋势数据点列表 */
  data: ExamTrendPoint[]
}

/**
 * 题型统计
 */
export interface QuestionTypeStats {
  /** 题型名称 */
  type: string
  /** 题目数量 */
  count: number
}

/**
 * 难度统计
 */
export interface QuestionDifficultyStats {
  /** 难度名称 */
  difficulty: string
  /** 题目数量 */
  count: number
}

/**
 * 题库统计
 */
export interface QuestionStats {
  /** 题型统计 */
  typeStats: QuestionTypeStats[]
  /** 难度统计 */
  difficultyStats: QuestionDifficultyStats[]
}

/**
 * 待办事项类型
 */
export enum TodoType {
  /** 待阅卷任务 */
  GRADING = 'grading',
  /** 即将开始的考试 */
  UPCOMING_EXAM = 'upcoming_exam'
}

/**
 * 待办事项
 */
export interface TodoItem {
  /** 待办事项ID */
  id: number
  /** 待办事项类型 */
  type: TodoType
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 时间 */
  time: string
  /** 跳转路径 */
  path: string
}

/**
 * 公告
 */
export interface Announcement {
  /** 公告ID */
  id: number
  /** 公告标题 */
  title: string
  /** 公告内容 */
  content: string
  /** 发布时间 */
  publishTime: string
}

/**
 * 快捷操作
 */
export interface QuickAction {
  /** 操作ID */
  id: string
  /** 操作名称 */
  name: string
  /** 操作图标 */
  icon: string
  /** 跳转路径 */
  path: string
  /** 背景色 */
  color: string
}
