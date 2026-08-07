/**
 * PostCSS 配置文件
 *
 * 功能：配置 postcss-pxtorem 插件，自动将 px 转换为 rem
 *
 * 配置说明：
 * - rootValue: 37.5 - 根字体大小，基于 375px 设计稿（375 / 10 = 37.5）
 * - propList: ['*'] - 转换所有 CSS 属性
 * - selectorBlackList: ['.van-'] - 排除 Vant 组件类名，因为 Vant 已经做了适配
 * - minPixelValue: 2 - 小于 2px 的值不转换
 */

export default {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 37.5,
      propList: ['*'],
      selectorBlackList: ['.van-'],
      minPixelValue: 2
    }
  }
}
