/**
 * 扩展构建配置（独立于主前端）
 *
 * 用 @crxjs/vite-plugin 读取 manifest.json，自动处理 MV3 的：
 * - service worker（ESM）打包
 * - content script 打包为可注入产物
 * - externally_connectable / web_accessible_resources 资源登记
 *
 * 产物目录 dist/，加载方式见 README。
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' }

export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest: manifest as unknown as Parameters<typeof crx>[0]['manifest'] })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // content script 内联 CSS，便于注入 Shadow DOM（不产出独立 css 请求）
    cssCodeSplit: false,
    target: 'es2022',
    rollupOptions: {
      // sidepanel 是扩展自有 HTML 页面。虽在 manifest 声明，仍显式登记为构建入口，
      // 输出路径与 manifest 中引用保持一致。
      // （骨架阶段仅保留 sidepanel；offscreen 大脑等在后续阶段接入。）
      input: {
        sidepanel: 'src/sidepanel/sidepanel.html'
      }
    }
  }
})
