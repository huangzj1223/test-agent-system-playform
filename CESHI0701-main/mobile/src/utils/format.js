/**
 * 文件名称：utils/format.js - 格式化工具函数
 *
 * 功能描述：
 *   提供常用的数据格式化工具函数
 *   包含日期、金额、手机号、文件大小等格式化方法
 *
 * 使用方式：
 *   import { formatDate, formatMoney, formatPhone, formatFileSize } from '@/utils/format'
 *   formatDate(new Date(), 'YYYY-MM-DD')
 *   formatMoney(1234.56)
 *   formatPhone('13800138000')
 *   formatFileSize(1024000)
 *
 * 主要功能：
 *   - 日期格式化（基于 dayjs）
 *   - 金额格式化（保留小数位）
 *   - 手机号脱敏（中间4位显示为 ****）
 *   - 文件大小格式化（自动转换单位）
 */

import dayjs from 'dayjs'

/**
 * 格式化日期
 * @param {string|number|Date} date - 日期（支持时间戳、日期字符串、Date 对象）
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - 格式化模板
 * @returns {string} 格式化后的日期字符串
 * @example formatDate(new Date(), 'YYYY-MM-DD') // '2025-12-27'
 */
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return ''
  return dayjs(date).format(format)
}

/**
 * 格式化金额
 * @param {number} amount - 金额数值
 * @param {number} [decimals=2] - 小数位数（默认2位）
 * @returns {string} 格式化后的金额字符串
 * @example formatMoney(1234.567, 2) // '1234.57'
 */
export const formatMoney = (amount, decimals = 2) => {
  if (typeof amount !== 'number') return '0.00'
  return amount.toFixed(decimals)
}

/**
 * 格式化手机号（脱敏处理）
 * @param {string} phone - 手机号
 * @returns {string} 格式化后的手机号（中间4位显示为 ****）
 * @example formatPhone('13800138000') // '138****8000'
 */
export const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3')
}

/**
 * 格式化文件大小
 * @param {number} bytes - 文件字节数
 * @returns {string} 格式化后的文件大小（自动转换单位）
 * @example formatFileSize(1024000) // '1000.00 KB'
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024 // 1KB = 1024 字节
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'] // 单位数组
  const i = Math.floor(Math.log(bytes) / Math.log(k)) // 计算单位索引
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}
