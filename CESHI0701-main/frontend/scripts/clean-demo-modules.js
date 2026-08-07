#!/usr/bin/env node

/**
 * 清理示例模块脚本
 *
 * 功能：清理项目中的示例模块，保留核心框架功能
 *
 * 清理范围：
 * - src/views 中的示例页面
 * - src/router/modules 中的示例路由
 * - src/api 中的示例 API
 * - src/mock 中的示例 Mock 数据
 * - src/locales/langs 中的示例国际化条目
 *
 * 使用方法：
 * node scripts/clean-demo-modules.js
 *
 * 或者添加到 package.json 的 scripts 中：
 * "clean:demo": "node scripts/clean-demo-modules.js"
 */

import fs from 'fs'
import path from 'path'

// ==================== 配置区域 ====================

/**
 * 需要保留的核心模块
 * 这些模块是框架的核心功能，不会被删除
 */
const KEEP_MODULES = {
  // views 目录中需要保留的模块
  views: [
    'auth', // 认证相关页面（登录、注册等）
    'exception', // 异常页面（404、403、500等）
    'index', // 首页/主框架
    'template', // 页面模板
    'widgets', // 组件示例（可选保留）
    'organization', // 组织架构管理
    'permission', // 权限管理
    'workbench', // 工作台
    'china-map', // 中国地图（保留页面，但路由会被删除）
    'operation-cockpit' // 运营驾驶舱（保留页面，但路由会被删除）
  ],

  // router/modules 目录中需要保留的路由文件
  router: [
    'index.ts', // 路由入口文件
    'exception.ts', // 异常页面路由
    'template.ts', // 模板路由
    'widgets.ts', // 组件路由（可选保留）
    'organization-template.ts', // 企业管理路由
    'permission-template.ts', // 权限管理路由
    'workbench.ts' // 工作台路由
    // 注意：china-map.ts 和 operation-cockpit.ts 路由会被删除
  ],

  // api 目录中需要保留的 API 文件
  api: [
    'auth.ts', // 认证 API
    'captcha.ts', // 验证码 API
    'map.ts', // 地图 API（可选保留）
    'organization.ts', // 组织架构 API
    'permission.ts' // 权限管理 API
  ],

  // mock 目录中需要保留的 Mock 文件
  mock: [
    'auth.ts', // 认证 Mock
    'json', // JSON 数据目录
    'temp', // 临时目录
    'upgrade', // 升级目录
    'map.ts', // 地图 Mock（可选保留）
    'organization.ts', // 组织架构 Mock
    'permission.ts' // 权限管理 Mock
  ],

  // locales/langs 中需要保留的国际化 key 前缀
  // 这些前缀开头的 key 会被保留，其他的会被删除
  i18nPrefixes: [
    'common', // 通用翻译
    'menus.workbench', // 工作台菜单
    'menus.organizationTemplate', // 企业管理菜单
    'menus.permissionTemplate', // 权限管理菜单
    'menus.template', // 模板菜单
    'menus.widgets' // 组件菜单（可选保留）
    // 注意：menus.chinaMap 和 menus.operationCockpit 会被删除
  ]
}

/**
 * 清理策略说明：
 *
 * 采用"白名单"模式：
 * - 只需要在 KEEP_MODULES 中标注要保留的核心模块
 * - 所有不在保留列表中的文件/目录都会被自动删除
 * - 这样更简洁，也更安全（新添加的示例模块会自动被清理）
 */

// ==================== 工具函数 ====================

/**
 * 删除文件或目录
 * @param {string} filePath - 文件或目录路径
 */
function deleteFileOrDir(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  路径不存在，跳过: ${filePath}`)
    return
  }

  const stats = fs.statSync(filePath)

  if (stats.isDirectory()) {
    // 递归删除目录
    const files = fs.readdirSync(filePath)
    files.forEach((file) => {
      deleteFileOrDir(path.join(filePath, file))
    })
    fs.rmdirSync(filePath)
    console.log(`✅ 已删除目录: ${filePath}`)
  } else {
    // 删除文件
    fs.unlinkSync(filePath)
    console.log(`✅ 已删除文件: ${filePath}`)
  }
}

/**
 * 清理 views 目录中的示例模块
 * 策略：删除所有不在保留列表中的目录
 */
function cleanViews() {
  console.log('\n📁 开始清理 views 目录...')
  const viewsDir = path.join(process.cwd(), 'src/views')

  if (!fs.existsSync(viewsDir)) {
    console.log('⚠️  views 目录不存在，跳过')
    return
  }

  const allDirs = fs.readdirSync(viewsDir)
  const toDelete = allDirs.filter((dir) => {
    // 跳过隐藏文件
    if (dir.startsWith('.')) return false
    // 只删除不在保留列表中的目录
    return !KEEP_MODULES.views.includes(dir)
  })

  if (toDelete.length === 0) {
    console.log('✅ 没有需要删除的模块')
    return
  }

  console.log(`📋 将删除 ${toDelete.length} 个模块: ${toDelete.join(', ')}`)
  toDelete.forEach((module) => {
    const modulePath = path.join(viewsDir, module)
    deleteFileOrDir(modulePath)
  })
}

/**
 * 清理 router/modules 目录中的示例路由
 * 策略：删除所有不在保留列表中的文件，并更新 index.ts 中的导入
 */
function cleanRouter() {
  console.log('\n📁 开始清理 router/modules 目录...')
  const routerDir = path.join(process.cwd(), 'src/router/modules')

  if (!fs.existsSync(routerDir)) {
    console.log('⚠️  router/modules 目录不存在，跳过')
    return
  }

  const allFiles = fs.readdirSync(routerDir)
  const toDelete = allFiles.filter((file) => {
    // 跳过隐藏文件
    if (file.startsWith('.')) return false
    // 只删除不在保留列表中的文件
    return !KEEP_MODULES.router.includes(file)
  })

  if (toDelete.length === 0) {
    console.log('✅ 没有需要删除的路由文件')
    return
  }

  console.log(`📋 将删除 ${toDelete.length} 个路由文件: ${toDelete.join(', ')}`)

  // 删除路由文件
  toDelete.forEach((file) => {
    const filePath = path.join(routerDir, file)
    deleteFileOrDir(filePath)
  })

  // 更新 index.ts 文件，移除已删除文件的导入
  updateRouterIndex(toDelete)
}

/**
 * 更新 router/modules/index.ts 文件
 * 移除已删除路由文件的导入语句和数组引用
 * @param {string[]} deletedFiles - 已删除的文件列表
 */
function updateRouterIndex(deletedFiles) {
  const indexPath = path.join(process.cwd(), 'src/router/modules/index.ts')

  if (!fs.existsSync(indexPath)) {
    console.log('⚠️  index.ts 文件不存在，跳过更新')
    return
  }

  console.log('\n📝 更新 router/modules/index.ts...')

  // 读取文件内容
  let content = fs.readFileSync(indexPath, 'utf-8')

  // 获取被删除文件的模块名（去掉 .ts 后缀，转换为驼峰命名）
  const deletedModules = deletedFiles
    .filter((file) => file.endsWith('.ts'))
    .map((file) => {
      // 将文件名转换为可能的变量名
      // 例如: question-bank.ts -> questionBankRoutes
      const baseName = file.replace('.ts', '')
      const camelCase = baseName
        .split('-')
        .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('')
      return camelCase + 'Routes'
    })

  if (deletedModules.length === 0) {
    console.log('✅ 没有需要更新的导入')
    return
  }

  console.log(`📋 将移除以下模块的导入: ${deletedModules.join(', ')}`)

  // 移除导入语句
  deletedModules.forEach((moduleName) => {
    // 匹配导入语句，例如: import { questionBankRoutes } from './question-bank'
    const importRegex = new RegExp(
      `import\\s+{\\s*${moduleName}\\s*}\\s+from\\s+['"]\\.[^'"]+['"]\\s*\\n?`,
      'g'
    )
    content = content.replace(importRegex, '')
  })

  // 移除数组中的引用
  deletedModules.forEach((moduleName) => {
    // 匹配数组中的引用，处理多种情况：
    // 1. moduleName,\n (中间项)
    // 2. ,\n  moduleName (最后一项)
    // 3. moduleName\n (唯一项，但这种情况不太可能)
    const arrayRefRegex1 = new RegExp(`\\s*${moduleName},?\\s*\\n`, 'g')
    const arrayRefRegex2 = new RegExp(`,\\s*\\n\\s*${moduleName}`, 'g')

    content = content.replace(arrayRefRegex1, '\n')
    content = content.replace(arrayRefRegex2, '')
  })

  // 清理多余的空行（连续超过2个空行的情况）
  content = content.replace(/\n{3,}/g, '\n\n')

  // 写回文件
  fs.writeFileSync(indexPath, content, 'utf-8')
  console.log('✅ index.ts 更新完成')
}

/**
 * 清理 api 目录中的示例 API
 * 策略：删除所有不在保留列表中的文件
 */
function cleanApi() {
  console.log('\n📁 开始清理 api 目录...')
  const apiDir = path.join(process.cwd(), 'src/api')

  if (!fs.existsSync(apiDir)) {
    console.log('⚠️  api 目录不存在，跳过')
    return
  }

  const allFiles = fs.readdirSync(apiDir)
  const toDelete = allFiles.filter((file) => {
    // 跳过隐藏文件
    if (file.startsWith('.')) return false
    // 只删除不在保留列表中的文件
    return !KEEP_MODULES.api.includes(file)
  })

  if (toDelete.length === 0) {
    console.log('✅ 没有需要删除的 API 文件')
    return
  }

  console.log(`📋 将删除 ${toDelete.length} 个 API 文件: ${toDelete.join(', ')}`)
  toDelete.forEach((file) => {
    const filePath = path.join(apiDir, file)
    deleteFileOrDir(filePath)
  })
}

/**
 * 清理 mock 目录中的示例 Mock 数据
 * 策略：删除所有不在保留列表中的文件/目录
 */
function cleanMock() {
  console.log('\n📁 开始清理 mock 目录...')
  const mockDir = path.join(process.cwd(), 'src/mock')

  if (!fs.existsSync(mockDir)) {
    console.log('⚠️  mock 目录不存在，跳过')
    return
  }

  const allItems = fs.readdirSync(mockDir)
  const toDelete = allItems.filter((item) => {
    // 跳过隐藏文件
    if (item.startsWith('.')) return false
    // 只删除不在保留列表中的文件/目录
    return !KEEP_MODULES.mock.includes(item)
  })

  if (toDelete.length === 0) {
    console.log('✅ 没有需要删除的 Mock 文件')
    return
  }

  console.log(`📋 将删除 ${toDelete.length} 个 Mock 文件: ${toDelete.join(', ')}`)
  toDelete.forEach((item) => {
    const itemPath = path.join(mockDir, item)
    deleteFileOrDir(itemPath)
  })
}

/**
 * 清理国际化文件中的示例条目
 * 策略：删除所有不在保留列表中的 menus 条目
 */
function cleanI18n() {
  console.log('\n📁 开始清理国际化文件...')
  const langsDir = path.join(process.cwd(), 'src/locales/langs')
  const langFiles = ['zh.json', 'en.json']

  langFiles.forEach((file) => {
    const filePath = path.join(langsDir, file)

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在，跳过: ${filePath}`)
      return
    }

    try {
      // 读取 JSON 文件
      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)

      // 清理 menus 中的示例条目
      if (data.menus) {
        const allMenuKeys = Object.keys(data.menus)
        const toDelete = []

        allMenuKeys.forEach((key) => {
          // 检查是否在保留列表中
          const isKeep = KEEP_MODULES.i18nPrefixes.some((prefix) => {
            // 提取前缀的最后一部分，如 'menus.workbench' -> 'workbench'
            const prefixKey = prefix.split('.').pop()
            return key === prefixKey
          })

          if (!isKeep && key !== 'title') {
            // 不保留且不是 title，则删除
            toDelete.push(key)
            delete data.menus[key]
          }
        })

        if (toDelete.length > 0) {
          console.log(`✅ 已删除国际化条目 (${file}): ${toDelete.join(', ')}`)
        } else {
          console.log(`✅ 没有需要删除的国际化条目 (${file})`)
        }
      }

      // 写回文件
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`✅ 已更新国际化文件: ${file}`)
    } catch (error) {
      console.error(`❌ 处理国际化文件失败: ${file}`, error.message)
    }
  })
}

/**
 * 显示清理摘要
 */
function showSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 清理摘要')
  console.log('='.repeat(60))

  console.log('\n🔒 保留的核心模块：')
  console.log('  - Views:', KEEP_MODULES.views.join(', '))
  console.log('  - Router:', KEEP_MODULES.router.join(', '))
  console.log('  - API:', KEEP_MODULES.api.join(', '))
  console.log('  - Mock:', KEEP_MODULES.mock.join(', '))
  console.log('  - I18n Prefixes:', KEEP_MODULES.i18nPrefixes.join(', '))

  console.log('\n' + '='.repeat(60))
  console.log('✨ 清理完成！框架现在更干净了。')
  console.log('='.repeat(60) + '\n')
}

/**
 * 确认清理操作
 */
function confirmClean() {
  console.log('\n' + '='.repeat(60))
  console.log('⚠️  警告：此操作将删除所有不在保留列表中的模块！')
  console.log('='.repeat(60))
  console.log('\n清理策略：')
  console.log('  ✅ 保留列表中的模块会被保留')
  console.log('  ❌ 其他所有模块都会被删除')
  console.log('\n保留的核心模块：')
  console.log('  - Views:', KEEP_MODULES.views.join(', '))
  console.log('  - Router:', KEEP_MODULES.router.join(', '))
  console.log('  - API:', KEEP_MODULES.api.join(', '))
  console.log('  - Mock:', KEEP_MODULES.mock.join(', '))
  console.log('\n如果要继续，请在 5 秒内按 Ctrl+C 取消...\n')
}

// ==================== 主函数 ====================

/**
 * 主函数
 */
async function main() {
  try {
    // 显示确认信息
    confirmClean()

    // 等待 5 秒
    await new Promise((resolve) => setTimeout(resolve, 5000))

    console.log('🚀 开始清理示例模块...\n')

    // 执行清理
    cleanViews()
    cleanRouter()
    cleanApi()
    cleanMock()
    cleanI18n()

    // 显示摘要
    showSummary()

    console.log('💡 提示：')
    console.log('  1. 请运行 npm run build 验证项目是否正常')
    console.log('  2. 如果需要恢复，请使用 git 恢复删除的文件')
    console.log('  3. 建议在清理前先提交代码到 git\n')
  } catch (error) {
    console.error('\n❌ 清理过程中发生错误:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// 执行主函数
main()
