<!-- 记忆详情面板：头部(信息+版本+操作) + 内容预览/修改记录/关联记忆/权限设置 子页签 + 编辑态 + 底部元信息 -->
<template>
  <div class="mem-detail">
    <div v-if="!file" class="md-empty">选择左侧一个记忆文件查看详情</div>

    <template v-else>
      <!-- 头部：文件信息 + 版本下拉 + 历史/建议/编辑 -->
      <div class="md-header">
        <div class="md-title">
          <i class="iconfont-sys md-file-icon">&#xe816;</i>
          <div class="md-title-text">
            <div class="md-name">{{ file.name }}</div>
            <div class="md-subtitle">{{ file.subtitle }}</div>
          </div>
        </div>

        <div class="md-actions">
          <ElSelect :model-value="file.version" size="small" class="md-version" @change="onSelectVersion">
            <ElOption
              v-for="v in file.versions"
              :key="v.version"
              :label="v.current ? `${v.version}（当前）` : v.version"
              :value="v.version"
            />
          </ElSelect>
          <ElButton size="small" @click="emit('open-versions')">
            <i class="iconfont-sys md-btn-icon">&#xe6a3;</i>历史版本
          </ElButton>
          <ElButton size="small" @click="emit('open-suggestions')">
            <i class="iconfont-sys md-btn-icon">&#xe72e;</i>模型建议
            <ElTag v-if="file.suggestions.length" type="warning" size="small" effect="light" round>
              {{ file.suggestions.length }}
            </ElTag>
          </ElButton>
          <template v-if="!editing">
            <ElButton type="primary" size="small" @click="emit('edit')">
              <i class="iconfont-sys md-btn-icon">&#xe70d;</i>编辑
            </ElButton>
            <ElButton
              type="danger"
              size="small"
              plain
              :disabled="file.builtin"
              :title="file.builtin ? '内置记忆文件不可删除' : '删除该记忆文件'"
              @click="emit('delete')"
            >
              删除
            </ElButton>
          </template>
          <template v-else>
            <ElButton type="primary" size="small" @click="onSave">保存</ElButton>
            <ElButton size="small" @click="onCancel">取消</ElButton>
            <ElButton size="small" @click="previewMode = !previewMode">
              {{ previewMode ? '继续编辑' : '预览' }}
            </ElButton>
          </template>
        </div>
      </div>

      <!-- 编辑态：Markdown 文本编辑器 / 预览切换 -->
      <div v-if="editing" class="md-body">
        <div v-if="previewMode" class="md-markdown markdown" v-html="renderedContent"></div>
        <ElInput
          v-else
          v-model="draft"
          type="textarea"
          class="md-editor"
          resize="none"
          placeholder="输入 Markdown 记忆内容"
        />
      </div>

      <!-- 只读态：四个子页签 -->
      <ElTabs v-else v-model="activeTab" class="md-tabs">
        <!-- 内容预览 -->
        <ElTabPane label="内容预览" name="content">
          <div class="md-markdown markdown" v-html="renderedContent"></div>
        </ElTabPane>

        <!-- 修改记录 -->
        <ElTabPane label="修改记录" name="history">
          <ElTable :data="file.versions" size="small">
            <ElTableColumn label="版本" width="110" prop="version" />
            <ElTableColumn label="时间" width="150" prop="time" />
            <ElTableColumn label="更新人" width="120" prop="updater" />
            <ElTableColumn label="变更说明" min-width="140" prop="note" show-overflow-tooltip />
            <template #empty>暂无修改记录</template>
          </ElTable>
        </ElTabPane>

        <!-- 关联记忆 -->
        <ElTabPane label="关联记忆" name="related">
          <div v-if="file.relatedIds.length" class="md-related">
            <ElTag v-for="rid in file.relatedIds" :key="rid" class="md-related-tag" @click="emit('select', rid)">
              {{ rid }}
            </ElTag>
          </div>
          <div v-else class="md-text">暂无关联记忆</div>
        </ElTabPane>

        <!-- 权限设置 -->
        <ElTabPane label="权限设置" name="perms">
          <MemoryPermissionPanel :permission="file.permission" @change="(p) => emit('permission-change', p)" />
        </ElTabPane>
      </ElTabs>

      <!-- 底部元信息 -->
      <div class="md-footer">
        <div class="md-meta">
          <span>创建人：{{ file.creator }}</span>
          <span>创建时间：{{ file.createTime }}</span>
          <span>最后更新：{{ file.lastUpdate }}</span>
          <span>更新人：{{ file.updater }}</span>
        </div>
        <ElButton size="small" @click="onCopy">
          <i class="iconfont-sys md-btn-icon">&#xe763;</i>复制内容
        </ElButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import {
    ElButton, ElSelect, ElOption, ElTabs, ElTabPane, ElTable, ElTableColumn,
    ElTag, ElInput, ElMessage, ElMessageBox
  } from 'element-plus'
  import { renderMarkdown } from '@/utils/markdown/renderMarkdown'
  import MemoryPermissionPanel from './MemoryPermissionPanel.vue'
  import type { MemoryFile, MemoryPermission } from './memory-constants'

  defineOptions({ name: 'MemoryDetailPanel' })

  const props = defineProps<{
    /** 当前选中记忆文件 */
    file: MemoryFile | null
    /** 是否编辑态 */
    editing: boolean
  }>()

  const emit = defineEmits<{
    /** 进入编辑 */
    edit: []
    /** 保存内容 */
    save: [content: string]
    /** 取消编辑 */
    cancel: []
    /** 打开历史版本弹窗 */
    'open-versions': []
    /** 打开模型建议弹窗 */
    'open-suggestions': []
    /** 权限变更 */
    'permission-change': [patch: Partial<MemoryPermission>]
    /** 回滚到某版本（通过版本下拉直接切换） */
    rollback: [version: string]
    /** 选中关联记忆文件 */
    select: [id: string]
    /** 删除该记忆文件 */
    delete: []
  }>()

  /** 当前只读子页签 */
  const activeTab = ref('content')
  /** 编辑态草稿内容 */
  const draft = ref('')
  /** 编辑态下是否预览模式 */
  const previewMode = ref(false)

  /** 安全渲染的 Markdown：编辑预览时用草稿，否则用文件内容 */
  const renderedContent = computed(() =>
    renderMarkdown(editingPreviewSource())
  )

  /** 取当前应渲染的 Markdown 源文本 */
  function editingPreviewSource(): string {
    if (props.editing && previewMode.value) return draft.value
    return props.file?.content || ''
  }

  // 进入编辑态时用文件内容初始化草稿；切换文件时重置页签
  watch(
    () => [props.editing, props.file?.id] as const,
    ([isEditing]) => {
      if (isEditing) {
        draft.value = props.file?.content || ''
        previewMode.value = false
      } else {
        activeTab.value = 'content'
      }
    }
  )

  /** 头部下拉切换到非当前版本：二次确认后回滚（与历史版本弹窗保持一致） */
  const onSelectVersion = async (version: string) => {
    if (!props.file || version === props.file.version) return
    try {
      await ElMessageBox.confirm(`确定回滚到 ${version} 吗？当前内容将被该版本替换。`, '回滚确认', {
        type: 'warning'
      })
      emit('rollback', version)
      ElMessage.success(`已回滚到 ${version}`)
    } catch {
      // 用户取消，版本下拉自动恢复为当前值（受控 model-value）
    }
  }

  /** 保存草稿 */
  const onSave = () => {
    emit('save', draft.value)
    ElMessage.success('记忆内容已保存')
  }

  /** 取消编辑 */
  const onCancel = () => {
    emit('cancel')
  }

  /** 复制文件内容到剪贴板 */
  const onCopy = async () => {
    if (!props.file) return
    try {
      await navigator.clipboard.writeText(props.file.content)
      ElMessage.success('已复制记忆内容')
    } catch {
      ElMessage.error('复制失败')
    }
  }
</script>

<style lang="scss" scoped>
  .mem-detail {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    height: 100%;
    padding: 16px;
    overflow: hidden;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .md-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 13px;
    color: var(--art-text-gray-400);
  }

  .md-header {
    display: flex;
    flex-shrink: 0;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--art-border-color);

    .md-title {
      display: flex;
      gap: 10px;
      align-items: center;
      min-width: 0;
    }

    .md-file-icon {
      font-size: 26px;
      color: var(--art-primary);
    }

    .md-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .md-subtitle {
      margin-top: 2px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }

    .md-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: flex-end;
    }

    .md-version {
      width: 140px;
    }

    .md-btn-icon {
      margin-right: 2px;
      font-size: 13px;
    }
  }

  .md-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    margin-top: 8px;

    :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    :deep(.el-tab-pane) {
      height: 100%;
    }
  }

  .md-body {
    flex: 1;
    min-height: 0;
    margin-top: 12px;
    overflow: hidden;
  }

  .md-editor {
    height: 100%;

    :deep(.el-textarea__inner) {
      height: 100%;
      font-family: var(--art-font-mono, monospace);
      font-size: 13px;
      line-height: 1.7;
    }
  }

  // Markdown 阅读区：浅灰底 + 内边距，等宽代码块
  .md-markdown {
    padding: 16px 18px;
    overflow-y: auto;
    font-size: 14px;
    line-height: 1.7;
    color: var(--art-text-gray-800);
    background: var(--art-gray-100);
    border-radius: 8px;

    :deep(h1) {
      margin: 0 0 12px;
      font-size: 20px;
    }

    :deep(h2) {
      margin: 18px 0 10px;
      font-size: 16px;
    }

    :deep(ul),
    :deep(ol) {
      padding-left: 20px;
      margin: 8px 0;
    }

    :deep(li) {
      margin: 4px 0;
    }

    :deep(p) {
      margin: 8px 0;
    }

    :deep(pre) {
      padding: 12px 14px;
      overflow-x: auto;
      background: var(--art-main-bg-color);
      border: 1px solid var(--art-border-color);
      border-radius: 6px;
    }

    :deep(code) {
      font-family: var(--art-font-mono, monospace);
      font-size: 13px;
    }
  }

  .md-related {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .md-related-tag {
      cursor: pointer;
    }
  }

  .md-text {
    font-size: 13px;
    color: var(--art-text-gray-500);
  }

  .md-footer {
    display: flex;
    flex-shrink: 0;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    margin-top: 8px;
    border-top: 1px solid var(--art-border-color);

    .md-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }
</style>

