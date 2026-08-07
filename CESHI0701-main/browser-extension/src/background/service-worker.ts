/**
 * 扩展后台 Service Worker —— 骨架
 *
 * 目前仅设置“点击工具栏图标直接打开原生侧边栏”。
 * 标签编排、消息路由、offscreen 大脑等在后续阶段（专门分支）接入。
 */

// 点击工具栏图标直接打开原生侧边栏。
// setPanelBehavior 是持久化偏好；SW 每次唤醒/安装都设一次，幂等无副作用。
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((e) => console.warn('[AG] setPanelBehavior 失败：', (e as Error)?.message))
