/**
 * 考生管理类型定义
 */

/**
 * 状态枚举
 */
export enum StatusEnum {
  /** 停用 */
  DISABLED = 0,
  /** 启用 */
  ENABLED = 1
}

/**
 * 外部单位
 */
export interface ExternalUnit {
  /** 单位ID */
  id: number
  /** 单位名称 */
  name: string
  /** 上级单位ID */
  parentId?: number
  /** 联系人 */
  contact?: string
  contactPerson?: string
  /** 联系电话 */
  phone?: string
  contactPhone?: string
  /** 单位说明 */
  description?: string
  /** 备注 */
  remark?: string
  /** 考生数量 */
  studentCount?: number
  /** 创建时间 */
  createTime?: string
  /** 状态 */
  status?: StatusEnum
  /** 子单位列表 */
  children?: ExternalUnit[]
}

/**
 * 外部单位查询参数
 */
export interface UnitParams {
  /** 单位名称 */
  name?: string
  /** 状态 */
  status?: number | string | null
}

/**
 * 考生信息
 */
export interface Student {
  /** 考生ID */
  id: number
  /** 姓名 */
  name: string
  /** 身份证号 */
  idCard: string
  /** 工号/学号 */
  code?: string
  /** 部门 */
  department?: string
  /** 手机号 */
  phone: string
  /** 邮箱 */
  email?: string
  /** 所属单位ID */
  unitId?: number
  /** 所属单位名称 */
  unitName?: string
  /** 头像 */
  avatar?: string
  /** 备注 */
  remark?: string
  /** 注册时间 */
  registerTime?: string
  /** 创建时间 */
  createTime?: string
  /** 最后登录时间 */
  lastLoginTime?: string
  /** 状态 */
  status: StatusEnum
}

/**
 * 考生查询参数
 */
export interface StudentParams {
  /** 所属单位ID */
  unitId?: number
  /** 姓名 */
  name?: string
  /** 部门 */
  department?: string
  /** 手机号 */
  phone?: string
  /** 状态 */
  status?: number | string | null
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 考生导入数据
 */
export interface StudentImportData {
  /** 姓名 */
  name: string
  /** 工号/学号 */
  code: string
  /** 部门 */
  department: string
  /** 手机号 */
  phone: string
  /** 邮箱 */
  email?: string
}

/**
 * 考生导入结果
 */
export interface StudentImportResult {
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failCount: number
  /** 失败详情 */
  failList?: Array<{
    row: number
    name: string
    reason: string
  }>
}

/**
 * 考生列表查询参数（兼容别名）
 */
export type StudentListParams = StudentParams

/**
 * 考试记录
 */
export interface ExamRecord {
  /** 记录ID */
  id: number
  /** 考试ID */
  examId: number
  /** 考试名称 */
  examName: string
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName: string
  /** 考试时间 */
  examTime?: string
  /** 开始时间 */
  startTime?: string
  /** 结束时间 */
  endTime?: string
  /** 总分 */
  totalScore: number
  /** 得分 */
  score: number
  /** 及格分 */
  passScore: number
  /** 是否及格 */
  isPassed: boolean
  /** 正确率 */
  accuracy?: number
  /** 排名 */
  rank?: number
  /** 状态：0-未开始 1-进行中 2-已完成 3-已交卷 */
  status: number
  /** 提交时间 */
  submitTime?: string
}

/**
 * 考试记录查询参数
 */
export interface ExamRecordParams {
  /** 考生ID */
  studentId: number
  /** 考试名称 */
  examName?: string
  /** 开始时间 */
  startTime?: string
  /** 结束时间 */
  endTime?: string
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 练习记录
 */
export interface PracticeRecordItem {
  /** 记录ID */
  id: number
  /** 练习ID */
  practiceId: number
  /** 练习名称 */
  practiceName: string
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName?: string
  /** 练习时间 */
  practiceTime?: string
  /** 创建时间 */
  createTime: string
  /** 得分 */
  score?: number
  /** 正确题数 */
  correctCount: number
  /** 错误题数 */
  wrongCount: number
  /** 总题数 */
  totalCount: number
  /** 正确率 */
  accuracy: number
  /** 用时（分钟） */
  duration: number
}

/**
 * 练习记录查询参数
 */
export interface PracticeRecordParams {
  /** 考生ID */
  studentId: number
  /** 练习名称 */
  practiceName?: string
  /** 开始时间 */
  startTime?: string
  /** 结束时间 */
  endTime?: string
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

/**
 * 证书信息
 */
export interface Certificate {
  /** 证书ID */
  id: number
  /** 证书名称 */
  name?: string
  certificateName: string
  /** 证书编号 */
  certificateNo: string
  /** 考试ID */
  examId: number
  /** 考试名称 */
  examName: string
  /** 考生ID */
  studentId: number
  /** 考生姓名 */
  studentName?: string
  /** 考试得分 */
  score: number
  /** 颁发日期 */
  issueDate: string
  /** 有效期至 */
  expiryDate?: string
  /** 获得时间 */
  obtainTime?: string
  /** 证书URL */
  certificateUrl?: string
}

/**
 * 证书查询参数
 */
export interface CertificateParams {
  /** 考生ID */
  studentId: number
  /** 当前页码 */
  page: number
  /** 每页大小 */
  pageSize: number
}

// 类型别名（兼容性）
export type UnitQueryParams = UnitParams
export type StudentQueryParams = StudentParams
export type ExamRecordQueryParams = ExamRecordParams & { status?: number | string | null }
export type PracticeRecordQueryParams = PracticeRecordParams
export type CertificateQueryParams = CertificateParams & { certificateName?: string }
