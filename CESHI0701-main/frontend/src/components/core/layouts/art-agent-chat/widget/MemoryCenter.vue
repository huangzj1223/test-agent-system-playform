<!-- 记忆中心：统计卡片 + 左侧[记忆文件列表 + 待确认记忆] + 右侧详情面板，前端状态实现 -->
<template>
  <div class="memory-center">
    <!-- 顶部统计卡片 -->
    <MemoryStatsCards :stats="store.stats" :pending-count="store.pendingCount" />

    <!-- 主体：左侧列表区 | 右侧详情 -->
    <div class="mc-body">
      <div class="mc-left">
        <MemoryFileList
          class="mc-files"
          :files="store.files"
          :selected-id="store.selectedId"
          @select="store.select"
          @create="onCreate"
          @toggle="onToggle"
        />
        <PendingMemoryList
          class="mc-pending"
          :items="store.pending"
          @confirm="onConfirmPending"
          @ignore="store.ignorePending"
        />
      </div>

      <MemoryDetailPanel
        :file="store.selected"
        :editing="store.editing"
        @edit="store.startEdit"
        @save="onSave"
        @cancel="store.cancelEdit"
        @select="store.select"
        @rollback="onRollback"
        @permission-change="store.updatePermission"
        @open-versions="versionVisible = true"
        @open-suggestions="suggestionVisible = true"
        @delete="onDelete"
      />
    </div>

    <!-- 历史版本弹窗 -->
    <MemoryVersionModal
      v-if="store.selected"
      v-model:visible="versionVisible"
      :file-name="store.selected.name"
      :versions="store.selected.versions"
      @rollback="onRollback"
    />

    <!-- 模型建议弹窗 -->
    <MemorySuggestionModal
      v-if="store.selected"
      v-model:visible="suggestionVisible"
      :file-name="store.selected.name"
      :suggestions="store.selected.suggestions"
      @apply="onApplySuggestion"
      @ignore="store.ignoreSuggestion"
    />
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useAgentMemoryStore } from '@/store/modules/agentMemory'
  import MemoryStatsCards from './memory-center/MemoryStatsCards.vue'
  import MemoryFileList from './memory-center/MemoryFileList.vue'
  import PendingMemoryList from './memory-center/PendingMemoryList.vue'
  import MemoryDetailPanel from './memory-center/MemoryDetailPanel.vue'
  import MemoryVersionModal from './memory-center/MemoryVersionModal.vue'
  import MemorySuggestionModal from './memory-center/MemorySuggestionModal.vue'

  defineOptions({ name: 'MemoryCenter' })

  const store = useAgentMemoryStore()

  /** 历史版本弹窗可见 */
  const versionVisible = ref(false)
  /** 模型建议弹窗可见 */
  const suggestionVisible = ref(false)

  /**
   * 记忆写入安全守卫（fail-closed）：写入前先过安全裁决。
   * - 拒绝：提示 blockedReason 并中止
   * - 需审批：提示需审批并中止（后端亦会拦截）
   * - 需确认：弹二次确认框（展示命中策略），确认后带 confirmed=true 执行；取消则中止
   * - 放行：直接执行
   * @param memoryKey 目标文件 key
   * @param text 拟写入内容
   * @param write 实际写入回调，入参为 confirmed 标记
   * @returns 是否已执行写入
   */
  const guardedWrite = async (
    memoryKey: string,
    text: string,
    write: (confirmed: boolean) => Promise<void>
  ): Promise<boolean> => {
    const decision = await store.checkWrite(memoryKey, text)
    if (!decision) return false
    if (!decision.allowed) {
      ElMessage.error(decision.blockedReason || '安全策略拒绝该记忆写入')
      return false
    }
    if (decision.requireApproval) {
      ElMessage.warning('该记忆写入需审批后执行')
      return false
    }
    if (decision.requireConfirm) {
      const policies = decision.matchedPolicies?.length
        ? `\n命中策略：${decision.matchedPolicies.join('；')}`
        : ''
      try {
        await ElMessageBox.confirm(`该记忆写入命中安全策略，需人工确认。${policies}`, '写入确认', {
          type: 'warning',
          confirmButtonText: '确认写入',
          cancelButtonText: '取消'
        })
      } catch {
        return false // 用户取消
      }
      await write(true)
      return true
    }
    await write(false)
    return true
  }

  /** 保存编辑内容（经安全守卫） */
  const onSave = async (content: string) => {
    const file = store.selected
    if (!file) return
    try {
      const done = await guardedWrite(file.id, content, (confirmed) => store.saveContent(content, confirmed))
      if (done) ElMessage.success('已保存')
    } catch {
      ElMessage.error('保存失败')
    }
  }

  /** 确认待确认记忆（经安全守卫，可含编辑后文本，提示写入的目标文件） */
  const onConfirmPending = async (payload: { id: string; text?: string }) => {
    const item = store.pending.find((p) => p.id === payload.id)
    if (!item) return
    const text = payload.text ?? item.text
    try {
      const done = await guardedWrite(item.target, text, (confirmed) =>
        store.confirmPending(payload.id, payload.text, confirmed)
      )
      if (done) ElMessage.success(`已写入 ${item.target}`)
    } catch {
      ElMessage.error('确认失败')
    }
  }

  /** 应用模型建议（经安全守卫，可含编辑后文本） */
  const onApplySuggestion = async (payload: { id: string; text?: string }) => {
    const file = store.selected
    if (!file) return
    const sug = file.suggestions.find((s) => s.id === payload.id)
    const text = payload.text ?? sug?.text ?? ''
    try {
      const done = await guardedWrite(file.id, text, (confirmed) =>
        store.applySuggestion(payload.id, payload.text, confirmed)
      )
      if (done) ElMessage.success('已应用建议')
    } catch {
      ElMessage.error('应用失败')
    }
  }

  /** 回滚版本（经安全守卫：回滚即以历史内容覆盖当前，需同等治理） */
  const onRollback = async (version: string) => {
    const file = store.selected
    if (!file) return
    const target = file.versions.find((v) => v.version === version)
    const text = target?.content ?? ''
    try {
      const done = await guardedWrite(file.id, text, (confirmed) => store.rollback(version, confirmed))
      if (done) ElMessage.success(`已回滚到 ${version}`)
    } catch {
      ElMessage.error('回滚失败')
    }
  }

  /** 新建记忆文件：弹窗输入文件名（.md），提交后端并刷新 */
  const onCreate = async () => {
    try {
      const { value } = await ElMessageBox.prompt('请输入记忆文件名（须以 .md 结尾）', '新建记忆文件', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^[a-zA-Z0-9_-]+\.md$/,
        inputErrorMessage: '文件名须为字母/数字/-/_ 且以 .md 结尾'
      })
      const memoryKey = value.trim()
      await store.createMemory({ memoryKey, name: memoryKey, description: '自定义记忆文件' })
      ElMessage.success(`已创建 ${memoryKey}`)
    } catch (e) {
      // 用户取消（cancel）不提示；接口错误由响应拦截器统一提示
      if (e !== 'cancel' && e !== 'close') ElMessage.error('新建失败')
    }
  }

  /** 删除当前记忆文件（二次确认，内置由按钮 disabled 拦截） */
  const onDelete = async () => {
    const file = store.selected
    if (!file) return
    try {
      await ElMessageBox.confirm(`确定删除记忆文件「${file.name}」？此操作不可恢复。`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      })
      await store.removeMemory(file.id)
      ElMessage.success(`已删除 ${file.name}`)
    } catch (e) {
      if (e !== 'cancel' && e !== 'close') ElMessage.error('删除失败')
    }
  }

  /** 启用/停用记忆文件 */
  const onToggle = async (id: string, enabled: boolean) => {
    try {
      await store.toggleFile(id, enabled)
      ElMessage.success(enabled ? '已启用' : '已停用')
    } catch {
      ElMessage.error('操作失败')
    }
  }

  // 首屏拉取记忆文件列表与统计
  onMounted(() => {
    store.fetchAll()
  })
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .memory-center {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .mc-body {
    display: flex;
    flex: 1;
    gap: 12px;
    min-height: 0;
  }

  .mc-left {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 12px;
    width: 380px;
    min-height: 0;

    // 文件列表占上半，待确认占下半，各自内部滚动
    .mc-files {
      flex: 3;
      min-height: 0;
    }

    .mc-pending {
      flex: 2;
      min-height: 0;
    }
  }
</style>
