/**
 * 文件名称：flexible.js - 移动端 rem 适配方案
 *
 * 功能描述：
 *   根据屏幕宽度动态设置根字体大小，实现移动端适配
 *
 * 适配规则：
 *   - 设计稿基准：375px
 *   - 根字体基准：37.5px（375 / 10 = 37.5）
 *   - 1rem = 37.5px（在 375px 屏幕下）
 *   - 最小宽度：320px
 *   - 最大宽度：750px（支持更大屏幕）
 *
 * 使用方式：
 *   在 main.js 中引入：import './utils/flexible'
 */

;(function (win, doc) {
  /**
   * 设置根字体大小
   */
  function setRemUnit() {
    const docEl = doc.documentElement
    // 获取屏幕宽度
    let clientWidth = docEl.clientWidth

    // 限制最小宽度为 320px
    if (clientWidth < 320) {
      clientWidth = 320
    }

    // 限制最大宽度为 750px
    if (clientWidth > 750) {
      clientWidth = 750
    }

    // 计算根字体大小：屏幕宽度 / 10
    // 例如：375px 屏幕 -> 375 / 10 = 37.5px
    // 例如：320px 屏幕 -> 320 / 10 = 32px
    // 例如：414px 屏幕 -> 414 / 10 = 41.4px
    const rem = clientWidth / 10

    // 设置根元素字体大小
    docEl.style.fontSize = rem + 'px'
  }

  // 初始化
  setRemUnit()

  // 监听窗口大小变化
  win.addEventListener('resize', setRemUnit)

  // 监听页面显示事件（处理页面缓存情况）
  win.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      setRemUnit()
    }
  })

  // 监听 DOMContentLoaded 事件
  doc.addEventListener('DOMContentLoaded', setRemUnit)
})(window, document)
