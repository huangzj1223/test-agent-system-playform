<!--
  浏览器原生侧边栏 SidePanel —— 骨架
  仅顶栏（品牌 + 新建/设置占位）与居中的“已就绪”空状态。
  完整对话、页面上下文、页面操作等在后续阶段（专门分支）接入。
-->
<template>
  <div class="sp">
    <!-- 顶栏 -->
    <header class="sp-head">
      <div class="sp-brand">
        <span class="sp-logo">AG</span>
        <span class="sp-name">AG-UI 智能体</span>
      </div>
      <div class="sp-head-actions">
        <button class="sp-icon-btn" type="button" aria-label="新建会话" title="新建会话" @click="noop">＋</button>
        <button class="sp-icon-btn" type="button" aria-label="设置" title="设置" @click="noop">⚙</button>
      </div>
    </header>

    <!-- 主体：居中空状态 -->
    <main class="sp-body">
      <div class="sp-empty">
        <span class="sp-empty-logo">AG</span>
        <div class="sp-empty-title">AG-UI 智能体已就绪</div>
        <p class="sp-empty-desc">侧边栏骨架已加载。完整对话与页面操作将在后续阶段接入。</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
  function noop(): void {
    // 后续阶段接入
  }
</script>

<style scoped>
  .sp {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    background: var(--ag-page-bg);
  }

  .sp-head {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 12px;
    background: var(--ag-card-bg);
    border-bottom: 1px solid var(--ag-border);
  }

  .sp-brand {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .sp-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    background: var(--ag-primary);
    border-radius: 7px;
  }

  .sp-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--ag-text-primary);
  }

  .sp-head-actions {
    display: flex;
    gap: 4px;
  }

  .sp-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    font-size: 16px;
    color: var(--ag-text-secondary);
    cursor: pointer;
    background: none;
    border: none;
    border-radius: 6px;
    transition: all 0.15s;
  }

  .sp-icon-btn:hover {
    color: var(--ag-primary);
    background: var(--ag-primary-light);
  }

  .sp-body {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: 24px;
  }

  .sp-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .sp-empty-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    margin-bottom: 16px;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    background: var(--ag-primary);
    border-radius: 14px;
  }

  .sp-empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--ag-text-primary);
  }

  .sp-empty-desc {
    max-width: 240px;
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--ag-text-secondary);
  }
</style>
