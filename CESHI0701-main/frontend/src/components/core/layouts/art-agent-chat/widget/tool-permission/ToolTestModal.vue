<!-- 工具测试弹窗：JSON 参数编辑 + 前端模拟执行 + 结果展示（含权限校验） -->
<template>
  <ElDialog
    :model-value="visible"
    :title="tool ? `测试工具：${tool.name}` : '测试工具'"
    width="640px"
    top="8vh"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
    @closed="result = null"
  >
    <template v-if="tool">
      <div class="tt-label">测试参数（JSON）</div>
      <ElInput v-model="paramText" type="textarea" :rows="6" class="tt-json" placeholder="输入 JSON 参数" />

      <div class="tt-actions">
        <ElButton type="primary" :loading="running" @click="onRun">执行测试</ElButton>
        <span v-if="paramError" class="tt-param-err">参数不是合法 JSON</span>
      </div>

      <!-- 执行结果 -->
      <div v-if="result" class="tt-result">
        <div class="tt-result-head">
          <ElTag :type="result.success ? 'success' : 'danger'" size="small">
            {{ result.success ? '执行成功' : '执行失败' }}
          </ElTag>
          <span class="tt-meta">耗时 {{ result.duration }}</span>
          <span class="tt-meta">exitCode: {{ result.exitCode }}</span>
        </div>

        <div class="tt-perm" :class="{ 'is-block': !result.permission.allowed }">
          <div>风险校验：{{ result.permission.riskLevel }}｜{{ result.permission.allowed ? '允许执行' : '禁止执行' }}</div>
          <div>人工确认：{{ result.permission.requireConfirm ? '需要' : '不需要' }}</div>
          <div v-if="result.permission.reason" class="tt-perm-reason">{{ result.permission.reason }}</div>
        </div>

        <div class="tt-io-label">stdout</div>
        <pre class="tt-io">{{ result.stdout || '（无输出）' }}</pre>
        <div class="tt-io-label">stderr</div>
        <pre class="tt-io tt-err">{{ result.stderr || '（无错误输出）' }}</pre>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { ElDialog, ElInput, ElButton, ElTag } from 'element-plus'
  import { checkToolPermission } from './toolPermission'
  import type { AgentTool, ToolAction, ToolPermissionCheckResult } from './types'

  defineOptions({ name: 'ToolTestModal' })

  const props = defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 目标工具 */
    tool: AgentTool | null
  }>()

  const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

  /** 模拟执行结果 */
  interface TestResult {
    success: boolean
    duration: string
    exitCode: number
    stdout: string
    stderr: string
    permission: ToolPermissionCheckResult
  }

  const paramText = ref('')
  const paramError = ref(false)
  const running = ref(false)
  const result = ref<TestResult | null>(null)

  /** 打开时按工具类型给出示例参数 */
  watch(
    () => [props.visible, props.tool] as const,
    ([visible]) => {
      if (visible && props.tool) {
        paramText.value = sampleParams(props.tool)
        paramError.value = false
        result.value = null
      }
    },
    { immediate: true }
  )

  /** 依据工具类型生成示例参数 */
  function sampleParams(tool: AgentTool): string {
    if (tool.key === 'backend-generator') {
      return JSON.stringify({ moduleName: 'department', tableName: 'sys_department', outputDir: 'src/modules/department' }, null, 2)
    }
    if (tool.type === 'database') return JSON.stringify({ sql: 'SELECT * FROM sys_user LIMIT 10' }, null, 2)
    if (tool.type === 'cli') return JSON.stringify({ command: tool.config.command || '' }, null, 2)
    return '{}'
  }

  /** 从参数推断动作（含 delete/删除语义则视为 delete） */
  function inferAction(tool: AgentTool, payload: Record<string, unknown>): ToolAction {
    const text = JSON.stringify(payload).toLowerCase()
    if (/delete|drop|truncate|rm -rf/.test(text)) return 'delete'
    if (tool.type === 'database' || tool.type === 'api') return 'read'
    return 'execute'
  }

  /** 执行前端模拟测试：解析参数 → 权限校验 → 生成模拟结果 */
  const onRun = () => {
    if (!props.tool) return
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(paramText.value || '{}')
      paramError.value = false
    } catch {
      paramError.value = true
      return
    }
    running.value = true
    // 模拟执行延迟
    window.setTimeout(() => {
      const tool = props.tool!
      const perm = checkToolPermission(tool, inferAction(tool, payload), payload)
      const ok = perm.allowed
      result.value = {
        success: ok,
        duration: `${(Math.random() * 10 + 2).toFixed(2)}s`,
        exitCode: ok ? 0 : 1,
        stdout: ok ? `[mock] 工具 ${tool.key} 执行完成\n参数: ${JSON.stringify(payload)}` : '',
        stderr: ok ? '' : `权限校验未通过：${perm.reason || '不允许执行'}`,
        permission: perm
      }
      running.value = false
    }, 600)
  }
</script>

<style lang="scss" scoped>
  .tt-label,
  .tt-io-label {
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--art-text-gray-700);
  }

  .tt-io-label {
    margin-top: 12px;
  }

  .tt-json :deep(.el-textarea__inner) {
    font-family: var(--art-font-mono, monospace);
    font-size: 13px;
  }

  .tt-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 12px;

    .tt-param-err {
      font-size: 12px;
      color: var(--art-danger);
    }
  }

  .tt-result {
    padding-top: 14px;
    margin-top: 14px;
    border-top: 1px solid var(--art-border-color);
  }

  .tt-result-head {
    display: flex;
    gap: 12px;
    align-items: center;

    .tt-meta {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }

  .tt-perm {
    padding: 10px 12px;
    margin: 12px 0;
    font-size: 12px;
    line-height: 1.7;
    color: var(--art-text-gray-700);
    background: var(--art-gray-100);
    border-radius: 8px;

    // 禁止执行时用浅红底提示
    &.is-block {
      color: #991b1b;
      background: rgba(220, 38, 38, 0.08);
    }

    .tt-perm-reason {
      margin-top: 2px;
    }
  }

  .tt-io {
    padding: 10px 12px;
    margin: 0;
    overflow-x: auto;
    font-family: var(--art-font-mono, monospace);
    font-size: 12px;
    white-space: pre-wrap;
    background: var(--art-gray-100);
    border-radius: 6px;

    &.tt-err {
      color: var(--art-danger);
    }
  }
</style>

