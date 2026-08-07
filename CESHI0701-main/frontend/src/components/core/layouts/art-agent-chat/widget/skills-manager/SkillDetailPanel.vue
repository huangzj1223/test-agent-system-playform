<!-- Skills 管理台右侧详情面板：基本信息/CLI绑定/触发规则/权限控制/运行日志 子页签 -->
<template>
  <div class="detail-panel">
    <div v-if="!skill" class="dp-empty">选择左侧一个 Skill 查看详情</div>
    <template v-else>
      <!-- 头部：名称 + 标签 + 启用开关 -->
      <div class="dp-header">
        <div class="dp-title">
          <span class="dp-name">{{ skill.name }}</span>
          <ElTag size="small" effect="light">{{ categoryLabel(skill.category) }}</ElTag>
          <ElTag :type="riskMeta(skill.riskLevel).tagType" size="small" effect="light">
            {{ riskMeta(skill.riskLevel).label }}
          </ElTag>
        </div>
        <ElSwitch
          :model-value="skill.enabled"
          @change="(v) => emit('toggle', skill!, Boolean(v))"
        />
      </div>

      <ElTabs v-model="activeTab" class="dp-tabs">
        <!-- 基本信息 -->
        <ElTabPane label="基本信息" name="basic">
          <div class="dp-section">
            <div class="dp-label">能力说明</div>
            <div class="dp-cap-list">
              <div v-for="k in skill.capabilities" :key="k" class="dp-cap-row">
                <ElTag size="small" class="dp-cap">{{ capLabel(k) }}</ElTag>
                <ElButton
                  size="small"
                  link
                  type="primary"
                  :disabled="isSensitive(k)"
                  :title="isSensitive(k) ? '敏感能力禁止测试' : '测试该能力'"
                  @click="openTest(k)"
                >
                  测试
                </ElButton>
              </div>
            </div>
          </div>
          <div class="dp-section">
            <div class="dp-label">技能描述</div>
            <div class="dp-text">{{ skill.description || '—' }}</div>
          </div>
          <div class="dp-section">
            <div class="dp-label">适用智能体</div>
            <div class="dp-text">{{ (skill.applicableAgents || []).join('、') || '—' }}</div>
          </div>
          <div class="dp-section">
            <div class="dp-label">版本信息</div>
            <div class="dp-text">
              当前版本：{{ skill.version }}　创建者：{{ skill.creator || '—' }}
            </div>
          </div>
        </ElTabPane>
        <!-- CLI 绑定 -->
        <ElTabPane label="CLI 绑定" name="cli">
          <div v-if="skill.cliCommand" class="dp-cli">
            <code>{{ skill.cliCommand }}</code>
            <button class="dp-copy" @click="copy(skill.cliCommand)">复制</button>
          </div>
          <div v-else class="dp-text">未配置 CLI 命令</div>
        </ElTabPane>
        <!-- 触发规则 -->
        <ElTabPane label="触发规则" name="trigger">
          <div class="dp-label">触发关键词</div>
          <div v-if="(skill.triggerKeywords || []).length" class="dp-caps">
            <ElTag v-for="kw in skill.triggerKeywords" :key="kw" size="small" class="dp-cap" type="warning">
              {{ kw }}
            </ElTag>
          </div>
          <div v-else class="dp-text">未配置触发关键词</div>
        </ElTabPane>

        <!-- 权限控制 -->
        <ElTabPane label="权限控制" name="perms">
          <div class="dp-text dp-risk-note">
            <i class="iconfont-sys">&#xe6a2;</i>
            风险等级 {{ riskMeta(skill.riskLevel).label }}：{{ riskNote(skill.riskLevel) }}
          </div>
        </ElTabPane>

        <!-- 运行日志 -->
        <ElTabPane label="运行日志" name="runlog">
          <div class="dp-log-filter">
            <ElSelect
              v-model="logSuccess"
              placeholder="全部结果"
              clearable
              size="small"
              class="dp-log-sel"
              @change="reloadLogs"
            >
              <ElOption :value="1" label="仅成功" />
              <ElOption :value="0" label="仅失败" />
            </ElSelect>
          </div>
          <ElTable :data="logs" size="small" max-height="240">
            <ElTableColumn type="expand">
              <template #default="{ row }">
                <div class="dp-log-detail">
                  {{ (row as SkillRunLog).errorMsg || '无附加信息' }}
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="时间" width="150">
              <template #default="{ row }">{{ formatTime((row as SkillRunLog).createTime) }}</template>
            </ElTableColumn>
            <ElTableColumn label="能力" min-width="120" prop="capabilityKey" />
            <ElTableColumn label="结果" width="70">
              <template #default="{ row }">
                <ElTag :type="(row as SkillRunLog).success ? 'success' : 'danger'" size="small">
                  {{ (row as SkillRunLog).success ? '成功' : '失败' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="耗时" width="70">
              <template #default="{ row }">{{ (row as SkillRunLog).durationMs }}ms</template>
            </ElTableColumn>
            <template #empty>暂无运行记录</template>
          </ElTable>
          <div v-if="logTotal > logPageSize" class="dp-log-pager">
            <ElPagination
              layout="prev, pager, next"
              small
              :total="logTotal"
              :current-page="logPage"
              :page-size="logPageSize"
              @current-change="onLogPageChange"
            />
          </div>
        </ElTabPane>

        <ElTabPane label="版本历史" name="versions">
          <SkillVersionHistory :skill-id="skill.id" @rolled-back="emit('rolled-back')" />
        </ElTabPane>
      </ElTabs>

      <!-- 底部操作 -->
      <div class="dp-footer">
        <ElButton size="small" @click="emit('edit', skill)">编辑 Skill</ElButton>
      </div>
    </template>

    <!-- 能力测试弹窗 -->
    <ElDialog v-model="testVisible" title="能力测试" width="440px" append-to-body>
      <div class="dp-test-cap">能力：{{ capLabel(testCapKey) }}</div>
      <ElInput
        v-model="testParamsText"
        type="textarea"
        :rows="4"
        placeholder='测试参数（JSON），如 {"keyword":"user"}'
      />
      <div v-if="testResult" class="dp-test-result" :class="{ ok: testResult.success }">
        <div>{{ testResult.success ? '✓ 调用成功' : '✗ 调用失败' }}（{{ testResult.durationMs }}ms）</div>
        <div class="dp-test-summary">{{ testResult.blockedReason || testResult.resultSummary || '无返回内容' }}</div>
      </div>
      <template #footer>
        <ElButton size="small" @click="testVisible = false">关闭</ElButton>
        <ElButton size="small" type="primary" :loading="testing" @click="runTest">运行测试</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import {
    ElTag, ElSwitch, ElTabs, ElTabPane, ElTable, ElTableColumn,
    ElSelect, ElOption, ElPagination, ElButton, ElInput, ElDialog, ElMessage
  } from 'element-plus'
  import type {
    AgentSkill, AgentCapabilityItem, SkillCategory, SkillRiskLevel,
    SkillRunLog, SkillEnums, SkillTestResult
  } from '@/api/agentSkill'
  import { fetchSkillRunLogs, testSkillCapability } from '@/api/agentSkill'
  import { CATEGORY_LABELS, RISK_META } from './skill-constants'
  import SkillVersionHistory from './SkillVersionHistory.vue'

  defineOptions({ name: 'SkillDetailPanel' })

  const props = defineProps<{
    /** 当前选中技能 */
    skill: AgentSkill | null
    /** 后端下发枚举（风险说明含 L4，替代前端写死文案） */
    enums: SkillEnums
    /** 能力目录（用于展示能力名称、判断是否敏感） */
    catalog: AgentCapabilityItem[]
  }>()

  const emit = defineEmits<{
    /** 编辑 */
    edit: [skill: AgentSkill]
    /** 切换启用 */
    toggle: [skill: AgentSkill, enabled: boolean]
    /** 版本回滚成功（透传给父级刷新） */
    'rolled-back': []
  }>()

  /** 当前子页签 */
  const activeTab = ref('basic')

  /** 运行日志本地态（面板内部自拉，支持筛选 + 分页） */
  const logs = ref<SkillRunLog[]>([])
  const logPage = ref(1)
  const logPageSize = 10
  const logTotal = ref(0)
  /** 结果筛选：1=仅成功 0=仅失败 null/undefined=全部（ElSelect 清除会置 undefined） */
  const logSuccess = ref<1 | 0 | null | undefined>(null)

  /** 拉取当前技能的运行日志（按当前筛选/页码；失败静默不阻断面板） */
  const loadLogs = async (): Promise<void> => {
    if (!props.skill) {
      logs.value = []
      logTotal.value = 0
      return
    }
    // == null 同时兼容 null 与 undefined（clearable 清除后为 undefined），避免被误判为"仅失败"
    const success = logSuccess.value == null ? undefined : logSuccess.value === 1
    try {
      const res = await fetchSkillRunLogs(props.skill.id, logPage.value, logPageSize, success)
      logs.value = res.data?.list || []
      logTotal.value = res.data?.pagination?.total ?? 0
    } catch {
      logs.value = []
      logTotal.value = 0
    }
  }

  /** 切筛选：回到第 1 页重拉 */
  const reloadLogs = (): void => {
    logPage.value = 1
    void loadLogs()
  }

  /** 翻页 */
  const onLogPageChange = (p: number): void => {
    logPage.value = p
    void loadLogs()
  }

  // 选中技能变化时，重置筛选/页码并重新拉日志
  watch(
    () => props.skill?.id,
    () => {
      logPage.value = 1
      logSuccess.value = null
      void loadLogs()
    },
    { immediate: true }
  )

  const categoryLabel = (c: SkillCategory) => CATEGORY_LABELS[c] || c
  const riskMeta = (r: SkillRiskLevel) => RISK_META[r] || RISK_META.L1

  /** 风险等级说明文案：优先后端枚举 note（含 L4），空时用兜底 */
  const FALLBACK_RISK_NOTES: Record<string, string> = {
    L1: '只读/低风险操作，可直接调用。',
    L2: '涉及数据变更，调用需谨慎。',
    L3: '包含写入/修改本地文件等高风险操作，执行前需人工确认。',
    L4: '高风险执行（落盘/删除/危险命令等），默认拒绝，除非显式放行或通过审批。'
  }
  const riskNote = (r: SkillRiskLevel): string => {
    const fromEnum = props.enums.riskLevels.find((x) => x.key === r)?.note
    return fromEnum || FALLBACK_RISK_NOTES[r] || FALLBACK_RISK_NOTES.L1
  }

  /** 能力 key → 目录项（取显示名/敏感标记） */
  const capItem = (k: string) => props.catalog.find((c) => c.key === k)
  /** 能力显示名（目录有则用 label，否则回退 key） */
  const capLabel = (k: string) => capItem(k)?.label || k
  /** 是否敏感能力（敏感能力禁止测试） */
  const isSensitive = (k: string) => Boolean(capItem(k)?.sensitive)

  /** 能力测试弹窗态 */
  const testVisible = ref(false)
  const testCapKey = ref('')
  const testParamsText = ref('')
  const testResult = ref<SkillTestResult | null>(null)
  const testing = ref(false)

  /** 打开测试弹窗（敏感能力直接拦下） */
  const openTest = (k: string): void => {
    if (isSensitive(k)) return
    testCapKey.value = k
    testParamsText.value = ''
    testResult.value = null
    testVisible.value = true
  }

  /** 运行测试：解析 JSON 参数 → 调后端 test */
  const runTest = async (): Promise<void> => {
    if (!props.skill) return
    let params: Record<string, unknown> = {}
    const raw = testParamsText.value.trim()
    if (raw) {
      try {
        params = JSON.parse(raw)
      } catch {
        ElMessage.warning('参数不是合法 JSON')
        return
      }
    }
    testing.value = true
    try {
      const res = await testSkillCapability({ skillId: props.skill.id, capabilityKey: testCapKey.value, params })
      testResult.value = res.data ?? null
    } catch (e) {
      ElMessage.error((e as Error)?.message || '测试失败')
    } finally {
      testing.value = false
    }
  }

  /** 格式化时间戳为本地时间字符串 */
  const formatTime = (t: string): string => {
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN', { hour12: false })
  }

  /** 复制 CLI 命令 */
  const copy = async (text?: string | null) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制')
    } catch {
      ElMessage.error('复制失败')
    }
  }
</script>

<style lang="scss" scoped>
  .detail-panel {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    width: 340px;
    height: 100%;
    padding: 16px;
    overflow: hidden;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .dp-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 13px;
    color: var(--art-text-gray-400);
  }

  .dp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--art-border-color);

    .dp-title {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .dp-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }
  }

  .dp-tabs {
    flex: 1;
    min-height: 0;
    margin-top: 8px;
    overflow-y: auto;
  }

  .dp-section {
    margin-bottom: 14px;
  }

  .dp-label {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--art-text-gray-700);
  }

  .dp-text {
    font-size: 13px;
    line-height: 1.6;
    color: var(--art-text-gray-600);
  }

  .dp-caps {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .dp-cap {
      margin: 0;
    }
  }

  .dp-cli {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 10px 12px;
    background: var(--art-gray-100);
    border-radius: 8px;

    code {
      flex: 1;
      font-size: 12px;
      word-break: break-all;
    }

    .dp-copy {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--art-primary);
      cursor: pointer;
      background: transparent;
      border: none;
    }
  }

  .dp-risk-note {
    display: flex;
    gap: 6px;
    align-items: flex-start;

    i {
      color: var(--art-danger);
    }
  }

  .dp-footer {
    padding-top: 12px;
    border-top: 1px solid var(--art-border-color);
  }

  .dp-log-filter {
    margin-bottom: 8px;
    .dp-log-sel {
      width: 120px;
    }
  }
  .dp-log-detail {
    padding: 4px 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--art-text-gray-600);
    word-break: break-all;
  }
  .dp-log-pager {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
  .dp-cap-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    .dp-cap-row {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }
  }
  .dp-test-cap {
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--art-text-gray-700);
  }
  .dp-test-result {
    padding: 8px 10px;
    margin-top: 10px;
    font-size: 12px;
    color: var(--art-danger);
    background: var(--art-gray-100);
    border-radius: 6px;
    &.ok {
      color: var(--art-success);
    }
    .dp-test-summary {
      margin-top: 4px;
      color: var(--art-text-gray-600);
      word-break: break-all;
    }
  }
</style>
