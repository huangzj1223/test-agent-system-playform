/**
 * 图表工具函数
 * @description 提供图表配置处理相关的工具函数
 */

/**
 * 将配置对象中的函数字符串转换为真正的函数
 * 用于处理 labelFormatter 和 valueFormatter 等函数配置
 *
 * @param config - 图表配置对象
 * @returns 转换后的配置对象（函数字符串已转换为真正的函数）
 *
 * @example
 * // 转换前
 * const config = {
 *   axis: {
 *     y: {
 *       labelFormatter: "(value) => `${value} mm`"  // 字符串
 *     }
 *   }
 * }
 *
 * // 转换后
 * const converted = convertFunctionStrings(config)
 * // converted.axis.y.labelFormatter 现在是真正的函数
 */
export function convertFunctionStrings(config: any): any {
  if (!config || typeof config !== 'object') return config

  const result: any = Array.isArray(config) ? [] : {}

  for (const [key, value] of Object.entries(config)) {
    // 检测是否为函数字符串 (形如: "(value) => `${value} mm`")
    if (
      typeof value === 'string' &&
      value.trim().startsWith('(') &&
      value.includes('=>') &&
      value.includes('`')
    ) {
      try {
        // 使用 eval 将字符串转换为真正的函数
        result[key] = eval(value)
        console.log(`✅ [Admin] 转换函数字符串成功: ${key}`, value)
      } catch (e) {
        console.error(`❌ [Admin] 转换函数字符串失败: ${key}`, value, e)
        result[key] = value // 转换失败时保留原值
      }
    } else if (typeof value === 'object' && value !== null) {
      // 递归处理嵌套对象和数组
      result[key] = convertFunctionStrings(value)
    } else {
      result[key] = value
    }
  }

  return result
}
