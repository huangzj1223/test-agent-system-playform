<!-- 沙箱策略：CLI/文件/数据库/页面 4 组安全边界配置 + 保存 -->
<template>
  <div class="sandbox-panel">
    <div class="sp-head">
      <div class="sp-title-wrap">
        <span class="sp-title">沙箱策略</span>
        <span class="sp-desc">限制智能体在安全边界内执行 CLI、文件、数据库、页面和网络操作</span>
      </div>
      <ElButton type="primary" size="small" @click="onSave">保存配置</ElButton>
    </div>

    <!-- CLI 沙箱 -->
    <div class="sp-group">
      <div class="sp-group-head">
        <span class="sp-group-title">CLI 沙箱</span>
        <ElSwitch v-model="cli.enabled" />
      </div>
      <div class="sp-group-body" :class="{ 'is-disabled': !cli.enabled }">
        <div class="sp-tip sp-col-2">命令白名单 / 黑名单请前往「黑白名单」页统一配置</div>
        <div class="sp-switch"><span>允许 sudo</span><ElSwitch v-model="cli.allowSudo" /></div>
        <div class="sp-switch"><span>允许网络访问</span><ElSwitch v-model="cli.allowNetwork" /></div>
        <div class="sp-switch"><span>允许后台进程</span><ElSwitch v-model="cli.allowBackgroundProcess" /></div>
        <div class="sp-num"><span>最大执行时长</span><ElInputNumber v-model="cli.timeoutSeconds" :min="1" :max="3600" controls-position="right" /><em>秒</em></div>
        <div class="sp-num"><span>最大输出长度</span><ElInputNumber v-model="cli.maxOutputLength" :min="0" :step="1000" controls-position="right" /><em>字符</em></div>
      </div>
    </div>

    <!-- 文件沙箱 -->
    <div class="sp-group">
      <div class="sp-group-head">
        <span class="sp-group-title">文件沙箱</span>
        <ElSwitch v-model="file.enabled" />
      </div>
      <div class="sp-group-body" :class="{ 'is-disabled': !file.enabled }">
        <div class="sp-tip sp-col-2">可访问 / 禁止目录请前往「黑白名单」页的目录白名单统一配置</div>
        <div class="sp-switch"><span>允许读取</span><ElSwitch v-model="file.allowRead" /></div>
        <div class="sp-switch"><span>允许写入</span><ElSwitch v-model="file.allowWrite" /></div>
        <div class="sp-switch"><span>允许删除</span><ElSwitch v-model="file.allowDelete" /></div>
        <div class="sp-switch"><span>允许覆盖</span><ElSwitch v-model="file.allowOverwrite" /></div>
        <div class="sp-num"><span>文件大小限制</span><ElInputNumber v-model="file.maxFileSizeMB" :min="1" :max="1024" controls-position="right" /><em>MB</em></div>
        <div class="sp-field sp-col-2">
          <label>文件类型白名单</label>
          <ElInput v-model="fileExts" placeholder=".ts, .vue, .json" />
        </div>
      </div>
    </div>

<!-- 数据库沙箱 -->
    <div class="sp-group">
      <div class="sp-group-head">
        <span class="sp-group-title">数据库沙箱</span>
        <ElSwitch v-model="db.enabled" />
      </div>
      <div class="sp-group-body" :class="{ 'is-disabled': !db.enabled }">
        <div class="sp-switch"><span>默认只读</span><ElSwitch v-model="db.readonlyByDefault" /></div>
        <div class="sp-switch"><span>允许 INSERT</span><ElSwitch v-model="db.allowInsert" /></div>
        <div class="sp-switch"><span>允许 UPDATE</span><ElSwitch v-model="db.allowUpdate" /></div>
        <div class="sp-switch"><span>允许 DELETE</span><ElSwitch v-model="db.allowDelete" /></div>
        <div class="sp-num"><span>最大查询行数</span><ElInputNumber v-model="db.maxRows" :min="1" :step="100" controls-position="right" /><em>行</em></div>
        <div class="sp-num"><span>SQL 超时时间</span><ElInputNumber v-model="db.timeoutSeconds" :min="1" :max="600" controls-position="right" /><em>秒</em></div>
        <div class="sp-tip sp-col-2">允许 / 禁止访问表请前往「黑白名单」页的 API·数据库黑名单统一配置</div>
      </div>
    </div>

    <!-- 页面操作沙箱 -->
    <div class="sp-group">
      <div class="sp-group-head">
        <span class="sp-group-title">页面操作沙箱</span>
        <ElSwitch v-model="page.enabled" />
      </div>
      <div class="sp-group-body" :class="{ 'is-disabled': !page.enabled }">
        <div class="sp-switch"><span>允许点击</span><ElSwitch v-model="page.allowClick" /></div>
        <div class="sp-switch"><span>允许输入</span><ElSwitch v-model="page.allowInput" /></div>
        <div class="sp-switch"><span>允许提交表单</span><ElSwitch v-model="page.allowSubmit" /></div>
        <div class="sp-switch"><span>允许删除操作</span><ElSwitch v-model="page.allowDeleteAction" /></div>
        <div class="sp-switch"><span>允许跨页面跳转</span><ElSwitch v-model="page.allowNavigation" /></div>
        <div class="sp-switch"><span>高风险按钮点击前展示摘要</span><ElSwitch v-model="page.requireSummaryBeforeRiskAction" /></div>
      </div>
    </div>

    <div class="sp-save-bar">
      <ElButton type="primary" @click="onSave">保存配置</ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ElButton, ElSwitch, ElInput, ElInputNumber, ElMessage } from 'element-plus'
  import { useAgentSecurityStore } from '@/store/modules/agentSecurity'

  defineOptions({ name: 'SandboxPolicyPanel' })

  const store = useAgentSecurityStore()

  /** 4 组沙箱配置引用 */
  const cli = store.sandbox.cli
  const file = store.sandbox.file
  const db = store.sandbox.database
  const page = store.sandbox.page

  /** 文件类型白名单：数组 ↔ 逗号文本双向绑定（命令/目录/表名单已迁至黑白名单页，D2） */
  const fileExts = computed({
    get: () => file.allowedExtensions.join(', '),
    set: (v: string) => (file.allowedExtensions = v.split(/[，,]/).map((s) => s.trim()).filter(Boolean))
  })

  /** 保存配置 */
  const onSave = async () => {
    try {
      await store.saveSandbox()
      ElMessage.success('沙箱策略已保存')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    }
  }
</script>

<style lang="scss" scoped>
  .sandbox-panel {
    padding-right: 4px;
  }

  .sp-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;

    .sp-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sp-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .sp-desc {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .sp-group {
    margin-bottom: 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .sp-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--art-border-color);

    .sp-group-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }
  }

  .sp-group-body {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px 20px;
    padding: 16px;

    // 该组关闭时弱化（仍可编辑，视觉提示为主）
    &.is-disabled {
      opacity: 0.55;
    }
  }

  .sp-col-2 {
    grid-column: span 2;
  }

  // 迁移提示：命令/目录/表名单已归口到黑白名单页
  .sp-tip {
    padding: 8px 10px;
    font-size: 12px;
    color: var(--art-text-gray-500);
    background: var(--art-gray-100);
    border-radius: 6px;
  }

  .sp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 13px;
      font-weight: 500;
      color: var(--art-text-gray-700);
    }
  }

  .sp-switch,
  .sp-num {
    display: flex;
    gap: 10px;
    align-items: center;

    span {
      flex: 1;
      font-size: 13px;
      color: var(--art-text-gray-700);
    }

    em {
      font-size: 12px;
      font-style: normal;
      color: var(--art-text-gray-500);
    }
  }

  .sp-save-bar {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
