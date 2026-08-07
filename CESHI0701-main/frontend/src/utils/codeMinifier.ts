/**
 * @fileoverview JavaScript 代码压缩工具
 * @description 用于压缩 Axure 生成的 JavaScript 代码，减小代码体积
 * @author ProtoMart团队
 * @created 2024-01-16
 */

/**
 * 压缩 JavaScript 代码
 * 移除不必要的空格、换行符和注释，生成紧凑的单行代码
 *
 * @param code - 待压缩的 JavaScript 代码字符串
 * @returns 压缩后的代码字符串
 *
 * @example
 * ```typescript
 * const code = `
 *   function hello() {
 *     console.log('Hello World');
 *   }
 * `;
 * const minified = minifyJavaScript(code);
 * // 输出: "function hello(){console.log('Hello World');}"
 * ```
 */
export function minifyJavaScript(code: string): string {
  return (
    code
      .split('\n') // 按行分割
      .map((line) => line.trim()) // 去除每行首尾空格
      .filter((line) => line.length > 0) // 去除空行
      .join(' ') // 用单个空格连接
      .replace(/\s+/g, ' ') // 多个空格合并为一个
      .replace(/\s*([{}();,:])\s*/g, '$1') // 去除符号周围的空格
      .replace(/\)\s*{/g, '){') // 特殊处理 ){
      .replace(/}\s*else\s*{/g, '}else{') // 特殊处理 }else{
      .replace(/}\s*catch\s*{/g, '}catch{') // 特殊处理 }catch{
      // 保留必要的空格
      .replace(
        /\b(var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|throw|try|catch|finally|new|typeof|instanceof)\b/g,
        ' $1 '
      )
      .replace(/\s+/g, ' ') // 再次合并多余空格
      .trim()
  )
}
