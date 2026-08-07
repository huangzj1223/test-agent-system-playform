<!-- 风险等级设置：风险等级表格（增删改）+ 全局安全策略卡片列表 + 保存 -->
<template>
  <div class="risk-panel">
    <!-- 标题栏 -->
    <div class="rp-head">
      <div class="rp-title-wrap">
        <span class="rp-title">风险等级配置</span>
        <ElTooltip content="定义不同风险等级的权限和审批要求，确保智能体操作符合安全策略" placement="top">
          <i class="iconfont-sys rp-info">&#xe719;</i>
        </ElTooltip>
      </div>
      <div class="rp-actions">
        <ElButton size="small" :disabled="allLevelsUsed" @click="openCreate">新建等级</ElButton>
        <ElButton type="primary" size="small" @click="onSave">保存配置</ElButton>
      </div>
    </div>

    <!-- 风险等级表格 -->
    <ElTable :data="store.riskPolicies" size="small" class="rp-table">
      <ElTableColumn label="风险等级" width="130">
        <template #default="{ row }">
          <ElTag :type="riskMeta(row.level).tagType" size="small" effect="light" :class="riskMeta(row.level).className">
            {{ row.level }}
          </ElTag>
          <span class="rp-lvl-name">{{ row.name }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="说明" min-width="150" prop="description" show-overflow-tooltip />
      <ElTableColumn label="示例操作" min-width="180">
        <template #default="{ row }">{{ row.examples.join('、') }}</template>
      </ElTableColumn>
      <ElTableColumn label="审批要求" min-width="140" prop="approvalRequirement" show-overflow-tooltip />
      <ElTableColumn label="默认行为" width="110">
        <template #default="{ row }">
          <ElTag :type="actionMeta(row.defaultAction).tagType" size="small">
            {{ actionMeta(row.defaultAction).label }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="110">
        <template #default="{ row }">
          <ElButton type="primary" size="small" link @click="openEdit(row)">编辑</ElButton>
          <ElButton type="danger" size="small" link @click="onRemove(row)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- 全局安全策略 -->
    <div class="rp-global-title">全局安全策略</div>
    <div class="rp-global-list">
      <!-- 高风险操作二次确认 -->
      <div class="rp-global-item">
        <div class="rp-gi-icon"><i class="iconfont-sys">&#xe72e;</i></div>
        <div class="rp-gi-info">
          <div class="rp-gi-label">高风险操作二次确认</div>
          <div class="rp-gi-desc">对 L3 / L4 风险等级的操作，在审批通过后要求执行前二次确认</div>
        </div>
        <ElSwitch v-model="g.highRiskDoubleConfirm" />
      </div>

      <!-- 命令执行超时限制 -->
      <div class="rp-global-item">
        <div class="rp-gi-icon"><i class="iconfont-sys">&#xe6a3;</i></div>
        <div class="rp-gi-info">
          <div class="rp-gi-label">命令执行超时限制</div>
          <div class="rp-gi-desc">限制系统命令、脚本、CLI 执行的最长时间</div>
        </div>
        <ElInputNumber v-model="g.commandTimeoutSeconds" :min="1" :max="3600" controls-position="right" class="rp-gi-num" />
        <span class="rp-gi-suffix">秒</span>
      </div>

      <!-- 文件操作目录限制 -->
      <div class="rp-global-item">
        <div class="rp-gi-icon"><i class="iconfont-sys">&#xe816;</i></div>
        <div class="rp-gi-info">
          <div class="rp-gi-label">文件操作目录限制</div>
          <div class="rp-gi-desc">限制智能体可以访问和操作的文件目录范围</div>
        </div>
        <ElButton size="small" @click="dirVisible = true">配置目录</ElButton>
        <span class="rp-gi-dirs" @click="dirVisible = true">已配置 {{ store.blackWhiteList.dirWhitelist.length }} 个目录 ›</span>
      </div>

      <!-- 数据库写操作审批 -->
      <div class="rp-global-item">
        <div class="rp-gi-icon"><i class="iconfont-sys">&#xe6a1;</i></div>
        <div class="rp-gi-info">
          <div class="rp-gi-label">数据库写操作审批</div>
          <div class="rp-gi-desc">对所有数据库写操作，包括 INSERT / UPDATE / DELETE，强制开启审批</div>
        </div>
        <ElSwitch v-model="g.dbWriteApproval" />
      </div>

      <!-- 审计日志强制开启 -->
      <div class="rp-global-item">
        <div class="rp-gi-icon"><i class="iconfont-sys">&#xe6df;</i></div>
        <div class="rp-gi-info">
          <div class="rp-gi-label">审计日志强制开启</div>
          <div class="rp-gi-desc">记录所有智能体操作行为，包含成功、失败及审批信息</div>
        </div>
        <ElSwitch v-model="g.forceAuditLog" />
      </div>
    </div>

    <!-- 文件目录配置抽屉 -->
    <ElDrawer v-model="dirVisible" title="文件操作目录配置" size="420px" append-to-body>
      <div class="rp-dir-tip">配置智能体可访问和操作的目录白名单，每行一个路径。</div>
      <ElInput v-model="dirText" type="textarea" :rows="10" placeholder="/workspace/project/src" />
      <template #footer>
        <ElButton @click="dirVisible = false">取消</ElButton>
        <ElButton type="primary" @click="onSaveDirs">保存目录</ElButton>
      </template>
    </ElDrawer>

    <div class="rp-save-bar">
      <ElButton type="primary" @click="onSave">保存配置</ElButton>
    </div>

    <RiskPolicyFormModal
      v-model:visible="formVisible"
      :editing="editing"
      :existing-levels="existingLevels"
      @save="store.saveRiskPolicy"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, computed } from 'vue'
  import {
    ElTable, ElTableColumn, ElTag, ElButton, ElSwitch, ElInputNumber, ElInput,
    ElTooltip, ElDrawer, ElMessage, ElMessageBox
  } from 'element-plus'
  import { useAgentSecurityStore } from '@/store/modules/agentSecurity'
  import RiskPolicyFormModal from './RiskPolicyFormModal.vue'
  import { RISK_META, ACTION_META, type RiskLevelPolicy, type RiskLevel, type DefaultAction } from './types'

  defineOptions({ name: 'RiskLevelPolicyPanel' })

  const store = useAgentSecurityStore()

  /** 全局策略引用（直接编辑 store 状态，保存时提示） */
  const g = store.globalPolicy

  /** 表单弹窗 */
  const formVisible = ref(false)
  const editing = ref<RiskLevelPolicy | null>(null)
  /** 目录配置抽屉 */
  const dirVisible = ref(false)
  /** 目录文本（换行分隔，与 g.fileDirs 互转） */
  const dirText = ref('')

  const riskMeta = (r: RiskLevel) => RISK_META[r] || RISK_META.L1
  const actionMeta = (a: DefaultAction) => ACTION_META[a] || ACTION_META.allow

  /** 已存在的风险等级（传给表单弹窗过滤新建下拉） */
  const existingLevels = computed<RiskLevel[]>(() => store.riskPolicies.map((p) => p.level))
  /** 四档等级已全部配置时禁用新建 */
  const allLevelsUsed = computed(() => existingLevels.value.length >= 4)

  /** 打开新建 */
  const openCreate = () => {
    editing.value = null
    formVisible.value = true
  }

  /** 打开编辑 */
  const openEdit = (row: RiskLevelPolicy) => {
    editing.value = row
    formVisible.value = true
  }

  /** 删除（二次确认） */
  const onRemove = async (row: RiskLevelPolicy) => {
    try {
      await ElMessageBox.confirm(`确定删除风险等级「${row.level} ${row.name}」？`, '删除确认', { type: 'warning' })
      store.removeRiskPolicy(row.level)
      ElMessage.success('已删除')
    } catch {
      // 用户取消
    }
  }

  // 目录抽屉打开时从黑白名单的目录白名单(dir_white)回填文本（单一权威源，D2）
  watch(dirVisible, (open) => {
    if (open) dirText.value = store.blackWhiteList.dirWhitelist.map((i) => i.value).join('\n')
  })

  /**
   * 保存目录：将文本行与现有 dir_white 条目做差集，新增缺失项、删除移除项，
   * 全部通过黑白名单 API 落库（目录唯一权威源，不再写 global.fileDirs）。
   */
  const onSaveDirs = async () => {
    const next = dirText.value.split('\n').map((s) => s.trim()).filter(Boolean)
    const current = store.blackWhiteList.dirWhitelist
    try {
      // 删除不在新集合中的旧条目
      for (const item of current.filter((i) => !next.includes(i.value))) {
        await store.removeListItem('dirWhitelist', item.id)
      }
      // 新增新集合中不存在的项
      const existingValues = current.map((i) => i.value)
      for (const value of next.filter((v) => !existingValues.includes(v))) {
        await store.saveListItem('dirWhitelist', { id: 0, value, description: '', enabled: true })
      }
      g.fileDirLimitEnabled = next.length > 0
      dirVisible.value = false
      ElMessage.success('目录已保存')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    }
  }

  /** 保存配置 */
  const onSave = async () => {
    try {
      await store.saveGlobal()
      ElMessage.success('全局安全策略已保存')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    }
  }
</script>

<style lang="scss" scoped>
  .risk-panel {
    padding-right: 4px;
  }

  .rp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    .rp-title-wrap {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .rp-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .rp-info {
      font-size: 14px;
      color: var(--art-text-gray-400);
      cursor: help;
    }

    .rp-actions {
      display: flex;
      gap: 8px;
    }
  }

  .rp-table {
    margin-bottom: 24px;

    .rp-lvl-name {
      margin-left: 6px;
      font-size: 13px;
      color: var(--art-text-gray-700);
    }

    // L4 深红
    :deep(.risk-l4) {
      color: #7f1d1d;
      background: rgba(127, 29, 29, 0.12);
      border-color: rgba(127, 29, 29, 0.3);
    }
  }

  .rp-global-title {
    margin-bottom: 12px;
    font-size: 15px;
    font-weight: 600;
    color: var(--art-text-gray-900);
  }

  .rp-global-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rp-global-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;

    .rp-gi-icon {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      color: var(--art-primary);
      background: rgba(var(--art-primary), 0.1);
      border-radius: 8px;
    }

    .rp-gi-info {
      flex: 1;
      min-width: 0;
    }

    .rp-gi-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--art-text-gray-900);
    }

    .rp-gi-desc {
      margin-top: 2px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    .rp-gi-num {
      width: 140px;
    }

    .rp-gi-suffix {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    .rp-gi-dirs {
      font-size: 13px;
      color: var(--art-primary);
      cursor: pointer;
    }
  }

  .rp-save-bar {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .rp-dir-tip {
    margin-bottom: 10px;
    font-size: 13px;
    color: var(--art-text-gray-600);
  }
</style>
