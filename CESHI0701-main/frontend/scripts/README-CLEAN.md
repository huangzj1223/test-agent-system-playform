# 清理示例模块脚本使用说明

## 功能说明

`clean-demo-modules.js` 脚本用于清理项目中的示例模块，保留核心框架功能，让项目更干净、更适合作为新项目的起点。

## 清理范围

脚本会清理以下内容：

### 1. Views（页面）
- `src/views/question-bank/` - 题库管理示例页面

### 2. Router（路由）
- `src/router/modules/question-bank.ts` - 题库管理路由
- **自动更新** `src/router/modules/index.ts` - 移除已删除路由的导入和引用

### 3. API（接口）
- `src/api/question-bank.ts` - 题库管理 API
- `src/api/question.ts` - 题目 API

### 4. Mock（模拟数据）
- `src/mock/question-bank.ts` - 题库管理 Mock 数据

### 5. I18n（国际化）
- `src/locales/langs/zh.json` 中的 `menus.questionBank`
- `src/locales/langs/en.json` 中的 `menus.questionBank`

## 保留的核心模块

脚本会保留以下核心功能模块：

- **认证模块**：登录、注册等
- **异常页面**：404、403、500 等
- **首页框架**：主框架布局
- **组织架构**：用户、部门管理
- **权限管理**：角色、菜单、权限管理
- **工作台**：首页工作台
- **模板和组件**：页面模板和组件示例

## 使用方法

### 方法一：直接运行脚本

```bash
node scripts/clean-demo-modules.js
```

### 方法二：通过 npm scripts 运行

1. 在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "clean:demo": "node scripts/clean-demo-modules.js"
  }
}
```

2. 运行命令：

```bash
npm run clean:demo
```

## 注意事项

⚠️ **重要提示**：

1. **备份代码**：清理操作会永久删除文件，建议先提交代码到 git
2. **确认时间**：脚本执行前会等待 5 秒，可以按 Ctrl+C 取消
3. **验证构建**：清理后请运行 `npm run build` 验证项目是否正常
4. **恢复文件**：如需恢复，可使用 `git checkout` 恢复删除的文件

## 自定义清理

如果需要清理其他模块或保留不同的模块，可以编辑脚本中的配置：

### 添加需要删除的模块

在 `DEMO_MODULES` 对象中添加：

```javascript
const DEMO_MODULES = {
  views: [
    'question-bank',
    'your-module'  // 添加你的模块
  ],
  // ...
}
```

### 修改保留的模块

在 `KEEP_MODULES` 对象中修改：

```javascript
const KEEP_MODULES = {
  views: [
    'auth',
    'exception',
    // 添加或删除需要保留的模块
  ],
  // ...
}
```

## 清理后的操作

清理完成后，建议执行以下操作：

1. **验证构建**：
   ```bash
   npm run build
   ```

2. **检查路由**：
   - 打开 `src/router/index.ts`
   - 确认路由配置正确

3. **检查菜单**：
   - 启动项目 `npm run dev`
   - 检查菜单是否正常显示

4. **提交代码**：
   ```bash
   git add .
   git commit -m "chore: 清理示例模块"
   ```

## 常见问题

### Q: 清理后项目无法启动？
A: 检查是否有其他文件引用了被删除的模块，搜索项目中的 `question-bank` 关键词。

### Q: 如何恢复被删除的文件？
A: 使用 git 恢复：
```bash
git checkout HEAD -- src/views/question-bank
git checkout HEAD -- src/router/modules/question-bank.ts
# ... 恢复其他文件
```

### Q: 可以只清理部分内容吗？
A: 可以，编辑脚本注释掉不需要清理的部分：
```javascript
// cleanViews()     // 注释掉不清理 views
cleanRouter()
cleanApi()
// cleanMock()      // 注释掉不清理 mock
cleanI18n()
```

## 脚本输出示例

```
============================================================
⚠️  警告：此操作将删除示例模块，无法恢复！
============================================================

即将删除以下模块：
  - Views: question-bank
  - Router: question-bank.ts
  - API: question-bank.ts, question.ts
  - Mock: question-bank.ts
  - I18n: menus.questionBank

如果要继续，请在 5 秒内按 Ctrl+C 取消...

🚀 开始清理示例模块...

📁 开始清理 views 目录...
✅ 已删除目录: src/views/question-bank

📁 开始清理 router/modules 目录...
✅ 已删除文件: src/router/modules/question-bank.ts

📝 更新 router/modules/index.ts...
📋 将移除以下模块的导入: questionBankRoutes
✅ index.ts 更新完成

📁 开始清理 api 目录...
✅ 已删除文件: src/api/question-bank.ts
✅ 已删除文件: src/api/question.ts

📁 开始清理 mock 目录...
✅ 已删除文件: src/mock/question-bank.ts

📁 开始清理国际化文件...
✅ 已删除国际化条目: menus.questionBank (zh.json)
✅ 已更新国际化文件: zh.json
✅ 已删除国际化条目: menus.questionBank (en.json)
✅ 已更新国际化文件: en.json

============================================================
📊 清理摘要
============================================================

✅ 已清理的模块：
  - Views: question-bank
  - Router: question-bank.ts
  - API: question-bank.ts, question.ts
  - Mock: question-bank.ts
  - I18n: menus.questionBank

🔒 保留的核心模块：
  - Views: auth, exception, index, template, widgets, organization, permission, workbench, china-map, operation-cockpit
  - Router: index.ts, exception.ts, template.ts, widgets.ts, page-template.ts, workbench.ts, china-map.ts, operation-cockpit.ts
  - API: auth.ts, captcha.ts, map.ts, organization.ts, permission.ts
  - Mock: auth.ts, json, temp, upgrade, map.ts, organization.ts, permission.ts

============================================================
✨ 清理完成！框架现在更干净了。
============================================================

💡 提示：
  1. 请运行 npm run build 验证项目是否正常
  2. 如果需要恢复，请使用 git 恢复删除的文件
  3. 建议在清理前先提交代码到 git
```

## 维护说明

当项目添加新的示例模块时，需要更新脚本配置：

1. 在 `DEMO_MODULES` 中添加新的示例模块
2. 确保 `KEEP_MODULES` 中包含所有核心模块
3. 测试脚本是否正常工作

## 许可证

MIT
