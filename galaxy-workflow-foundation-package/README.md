# Galaxy Workflow Foundation Package

## 使用方法

1. 下载并解压本包。
2. 在 Codex 中打开 `test-agent-system-playform` 仓库的 `galaxy` 分支。
3. 让 Codex 执行：

```bash
node <本包路径>/apply-galaxy-foundation.mjs <仓库根目录>
cd <仓库根目录>/ui
npm ci
npm run test:galaxy
npm run build
```

4. 构建通过后，阅读：

```text
docs/galaxy-workflow/CODEX-NEXT-STEPS.md
```

5. 按文档完成轨道几何、箭头和空间动画，最后提交到 `galaxy`。

## 包内已包含

- 高质量业务无关银河 SVG 底图；
- 替换 Three.js 的轻量艺术背景层；
- 受控粒子层；
- 中心核心和阶段星体视觉覆盖样式；
- Node 契约测试；
- GitHub Actions 构建门禁；
- Codex 后续任务文档；
- 可重复执行的安装脚本。
