<!-- 运行日志详情抽屉：基础信息 + 按类型分派详情 + 底部操作（复制/导出/标记已处理/关闭） -->
<template>
  <ElDrawer
    :model-value="visible"
    title="日志详情"
    direction="rtl"
    size="520px"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="log" class="log-detail">
      <!-- 基础信息 -->
      <section class="ld-section">
        <div class="ld-section-title">基础信息</div>
        <div class="ld-info-grid">
          <div class="ld-info-item"><span class="ld-k">日志 ID</span><span class="ld-v">{{ log.id }}</span></div>
          <div class="ld-info-item"><span class="ld-k">会话 ID</span><span class="ld-v">{{ log.sessionId }}</span></div>
          <div class="ld-info-item"><span class="ld-k">请求 ID</span><span class="ld-v">{{ log.requestId }}</span></div>
          <div class="ld-info-item"><span class="ld-k">智能体</span><span class="ld-v">{{ log.agentName }}</span></div>
          <div class="ld-info-item">
            <span class="ld-k">日志类型</span>
            <span class="ld-v">
              <ElTag :type="typeMeta.tagType" size="small" effect="light" :class="typeMeta.className">
                {{ typeMeta.label }}
              </ElTag>
            </span>
          </div>
          <div class="ld-info-item">
            <span class="ld-k">执行状态</span>
            <span class="ld-v">
              <ElTag :type="statusMeta.tagType" size="small" effect="light" :class="statusMeta.className">
                {{ statusMeta.label }}
              </ElTag>
            </span>
          </div>
          <div class="ld-info-item"><span class="ld-k">开始时间</span><span class="ld-v">{{ log.startedAt }}</span></div>
          <div class="ld-info-item"><span class="ld-k">结束时间</span><span class="ld-v">{{ log.endedAt || '-' }}</span></div>
          <div class="ld-info-item"><span class="ld-k">总耗时</span><span class="ld-v">{{ formatDuration(log.durationMs) }}</span></div>
          <div class="ld-info-item"><span class="ld-k">操作用户</span><span class="ld-v">{{ log.user || '-' }}</span></div>
          <div class="ld-info-item"><span class="ld-k">来源页面</span><span class="ld-v">{{ log.sourcePage || '-' }}</span></div>
        </div>
      </section>

      <!-- 分派详情 -->
      <section class="ld-section">
        <div class="ld-section-title">{{ typeMeta.label }}详情</div>
        <!-- 一、对话日志 -->
        <template v-if="log.type === 'conversation'">
          <LogCodeBlock label="用户输入" :content="d.userInput" />
          <LogCodeBlock label="智能体回复" :content="d.agentReply" />
          <div class="ld-info-grid ld-mt">
            <div class="ld-info-item"><span class="ld-k">命中意图</span><span class="ld-v">{{ d.intent || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">命中 Skill</span><span class="ld-v">{{ d.hitSkill || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">是否触发工具</span><span class="ld-v">{{ boolText(d.triggeredTool) }}</span></div>
            <div class="ld-info-item"><span class="ld-k">是否命中记忆</span><span class="ld-v">{{ boolText(d.hitMemory) }}</span></div>
            <div class="ld-info-item"><span class="ld-k">模型名称</span><span class="ld-v">{{ d.model || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">Token 消耗</span><span class="ld-v">input {{ d.tokenInput }} / output {{ d.tokenOutput }}</span></div>
          </div>
        </template>

        <!-- 二、技能调用日志 -->
        <template v-else-if="log.type === 'skill'">
          <div class="ld-info-grid">
            <div class="ld-info-item"><span class="ld-k">Skill 名称</span><span class="ld-v">{{ d.skillName || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">Skill 版本</span><span class="ld-v">{{ d.version || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">触发方式</span><span class="ld-v">{{ d.trigger || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">风险等级</span><span class="ld-v">{{ d.riskLevel || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">权限校验</span><span class="ld-v">{{ d.permissionResult || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">是否人工确认</span><span class="ld-v">{{ d.manualConfirm || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">关联工具</span><span class="ld-v">{{ d.relatedTool || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">执行结果</span><span class="ld-v">{{ d.execResult || '-' }}</span></div>
          </div>
          <LogCodeBlock class="ld-mt" label="输入参数" :content="d.input" />
          <LogCodeBlock label="输出结果" :content="d.output" />
        </template>

        <!-- 三、工具执行日志 -->
        <template v-else-if="log.type === 'tool'">
          <div class="ld-info-grid">
            <div class="ld-info-item"><span class="ld-k">工具名称</span><span class="ld-v">{{ d.toolName || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">工具类型</span><span class="ld-v">{{ d.toolType || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">工作目录</span><span class="ld-v">{{ d.workDir || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">exitCode</span><span class="ld-v">{{ d.exitCode ?? '-' }}</span></div>
            <div class="ld-info-item ld-span2"><span class="ld-k">风险拦截结果</span><span class="ld-v">{{ d.riskResult || '-' }}</span></div>
          </div>
          <LogCodeBlock class="ld-mt" label="执行命令" :content="d.command" />
          <LogCodeBlock label="输入参数" :content="d.input" />
          <LogCodeBlock label="stdout" :content="d.stdout" />
          <LogCodeBlock label="stderr" :content="d.stderr" />
        </template>

        <!-- 四、错误日志 -->
        <template v-else-if="log.type === 'error'">
          <div class="ld-info-grid">
            <div class="ld-info-item"><span class="ld-k">错误类型</span><span class="ld-v">{{ d.errorType || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">错误级别</span><span class="ld-v">{{ d.errorLevel || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">发生位置</span><span class="ld-v">{{ d.location || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">是否已处理</span><span class="ld-v">{{ boolText(d.processed) }}</span></div>
            <div class="ld-info-item"><span class="ld-k">关联 Skill</span><span class="ld-v">{{ d.relatedSkill || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">关联工具</span><span class="ld-v">{{ d.relatedTool || '-' }}</span></div>
          </div>
          <LogCodeBlock class="ld-mt" label="错误消息" :content="d.errorMessage" />
          <LogCodeBlock label="错误堆栈" :content="d.errorStack" />
          <LogCodeBlock label="修复建议" :content="d.suggestion" />
        </template>

        <!-- 五、记忆命中日志 -->
        <template v-else-if="log.type === 'memory'">
          <div class="ld-info-grid">
            <div class="ld-info-item"><span class="ld-k">命中文件</span><span class="ld-v">{{ d.hitFiles || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">命中分数</span><span class="ld-v">{{ d.score ?? '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">使用位置</span><span class="ld-v">{{ d.usePosition || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">是否影响决策</span><span class="ld-v">{{ boolText(d.affectDecision) }}</span></div>
            <div class="ld-info-item ld-span2"><span class="ld-k">产生新记忆候选</span><span class="ld-v">{{ boolText(d.newCandidate) }}</span></div>
          </div>
          <LogCodeBlock class="ld-mt" label="命中内容" :content="d.hitContent" />
        </template>

        <!-- 六、系统事件日志 -->
        <template v-else>
          <div class="ld-info-grid">
            <div class="ld-info-item"><span class="ld-k">事件名称</span><span class="ld-v">{{ d.eventName || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">事件类型</span><span class="ld-v">{{ d.eventType || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">事件来源</span><span class="ld-v">{{ d.eventSource || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">事件时间</span><span class="ld-v">{{ d.eventTime || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">关联会话</span><span class="ld-v">{{ d.relatedSession || '-' }}</span></div>
            <div class="ld-info-item"><span class="ld-k">关联用户</span><span class="ld-v">{{ d.relatedUser || '-' }}</span></div>
          </div>
          <LogCodeBlock class="ld-mt" label="事件描述" :content="d.eventDesc" />
        </template>
      </section>
    </div>

    <template #footer>
      <div class="ld-footer">
        <ElButton @click="onCopy">复制日志</ElButton>
        <ElButton @click="emit('export', log!)">导出当前日志</ElButton>
        <ElButton v-if="log?.type === 'error'" type="warning" :disabled="log?.processed" @click="onMarkProcessed">
          {{ log?.processed ? '已处理' : '标记已处理' }}
        </ElButton>
        <ElButton type="primary" @click="emit('update:visible', false)">关闭</ElButton>
      </div>
    </template>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ElDrawer, ElTag, ElButton, ElMessage } from 'element-plus'
  import LogCodeBlock from './LogCodeBlock.vue'
  import {
    LOG_TYPE_META,
    LOG_STATUS_META,
    formatDuration,
    getLogTypeLabel,
    getLogStatusLabel,
    type AgentRunLog
  } from './runLogTypes'

  defineOptions({ name: 'RunLogDetailDrawer' })

  const props = defineProps<{
    /** 是否可见 */
    visible: boolean
    /** 当前日志 */
    log: AgentRunLog | null
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
    /** 导出当前日志 */
    export: [log: AgentRunLog]
    /** 标记已处理 */
    'mark-processed': [id: string]
  }>()

  /** 详情对象快捷引用 */
  const d = computed<Record<string, any>>(() => props.log?.detail ?? {})

  /** 类型/状态显示配置（log 为空时给安全默认值） */
  const typeMeta = computed(() =>
    props.log ? LOG_TYPE_META[props.log.type] : LOG_TYPE_META.conversation
  )
  const statusMeta = computed(() =>
    props.log ? LOG_STATUS_META[props.log.status] : LOG_STATUS_META.success
  )

  /** 布尔值 → 是/否 */
  const boolText = (v: unknown) => (v ? '是' : '否')

  /** 复制日志到剪贴板（拼装可读文本） */
  const onCopy = async () => {
    if (!props.log) return
    const l = props.log
    const text =
      `日志 ID：${l.id}\n` +
      `会话 ID：${l.sessionId}\n` +
      `请求 ID：${l.requestId}\n` +
      `智能体：${l.agentName}\n` +
      `类型：${getLogTypeLabel(l.type)}\n` +
      `状态：${getLogStatusLabel(l.status)}\n` +
      `内容摘要：${l.summary}\n` +
      `开始时间：${l.startedAt}\n` +
      `结束时间：${l.endedAt || '-'}\n` +
      `总耗时：${formatDuration(l.durationMs)}\n` +
      `详情：${JSON.stringify(l.detail, null, 2)}`
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('日志已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败，请检查浏览器剪贴板权限')
    }
  }

  /** 标记已处理 */
  const onMarkProcessed = () => {
    if (!props.log) return
    emit('mark-processed', props.log.id)
    ElMessage.success('已标记为已处理')
  }
</script>

<style lang="scss" scoped>
  .log-detail {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .ld-section {
    .ld-section-title {
      padding-bottom: 8px;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--art-text-gray-900);
      border-bottom: 1px solid var(--art-border-color);
    }
  }

  .ld-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 16px;

    &.ld-mt {
      margin-top: 12px;
    }
  }

  .ld-info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    &.ld-span2 {
      grid-column: span 2;
    }

    .ld-k {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    .ld-v {
      font-size: 13px;
      color: var(--art-text-gray-800);
      word-break: break-all;
    }
  }

  // 代码块之间留间距
  .log-detail :deep(.log-code-block) {
    margin-top: 12px;

    &.ld-mt {
      margin-top: 12px;
    }
  }

  .ld-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  // 类型自定义配色：技能调用=紫、记忆命中=青
  :deep(.lt-skill) {
    color: #7c3aed;
    background: rgba(124, 58, 237, 0.1);
    border-color: rgba(124, 58, 237, 0.25);
  }

  :deep(.lt-memory) {
    color: #0891b2;
    background: rgba(8, 145, 178, 0.1);
    border-color: rgba(8, 145, 178, 0.25);
  }
</style>
