<!-- 快捷提示词模板：增删改，保存后可在输入框快捷插入 -->
<template>
  <div class="cs-pane">
    <div class="pt-toolbar">
      <span class="cs-tip">最多 {{ limits.templateMaxCount }} 条，可在输入框工具栏快捷插入</span>
      <ElButton
        type="primary"
        size="small"
        :disabled="list.length >= limits.templateMaxCount"
        @click="openCreate"
      >
        新建模板
      </ElButton>
    </div>

    <ElTable :data="list" size="small" class="pt-table">
      <ElTableColumn label="标题" width="160">
        <template #default="{ row }">
          <span class="pt-title">{{ row.title }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="内容" min-width="240">
        <template #default="{ row }">
          <span class="pt-content">{{ row.content }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="120">
        <template #default="{ row, $index }">
          <ElButton type="primary" size="small" link @click="openEdit(row as PromptTemplate, $index)">
            编辑
          </ElButton>
          <ElButton type="danger" size="small" link @click="onDelete($index)">删除</ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无模板，点击「新建模板」添加</template>
    </ElTable>

    <!-- 新建/编辑弹窗 -->
    <ElDialog v-model="dialogVisible" :title="isEdit ? '编辑模板' : '新建模板'" width="480px" append-to-body>
      <ElForm :model="form" label-width="60px">
        <ElFormItem label="标题" required>
          <ElInput
            v-model="form.title"
            :maxlength="limits.templateTitleMaxLen"
            show-word-limit
            placeholder="如：翻译成英文"
          />
        </ElFormItem>
        <ElFormItem label="内容" required>
          <ElInput
            v-model="form.content"
            type="textarea"
            :rows="4"
            :maxlength="limits.templateContentMaxLen"
            show-word-limit
            placeholder="插入输入框的提示词文本"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="onSubmit">
          {{ isEdit ? '保存' : '创建' }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import {
    ElTable,
    ElTableColumn,
    ElButton,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElMessage,
    ElMessageBox
  } from 'element-plus'
  import { useAgentChatSettingStore } from '@/store/modules/agentChatSetting'
  import type { PromptTemplate } from '@/api/agentSetting'

  defineOptions({ name: 'PromptTemplatePane' })

  const store = useAgentChatSettingStore()
  /** 业务限制值（驱动模板数量与长度上限），来自后端全局配置 */
  const { limits } = storeToRefs(store)

  /** 模板列表（直接读 store，保存后由 store 刷新） */
  const list = computed<PromptTemplate[]>(() => store.promptTemplates)

  /** 弹窗可见性与编辑态 */
  const dialogVisible = ref(false)
  const saving = ref(false)
  /** 编辑中的下标（-1 表示新建） */
  const editingIndex = ref(-1)
  const isEdit = computed(() => editingIndex.value >= 0)
  const form = reactive({ title: '', content: '' })

  /** 生成模板 ID */
  const genTemplateId = (): string => `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  /** 打开新建弹窗 */
  const openCreate = () => {
    editingIndex.value = -1
    form.title = ''
    form.content = ''
    dialogVisible.value = true
  }

  /** 打开编辑弹窗（回填） */
  const openEdit = (row: PromptTemplate, index: number) => {
    editingIndex.value = index
    form.title = row.title
    form.content = row.content
    dialogVisible.value = true
  }

  /** 保存整份模板列表到后端 */
  const persist = async (next: PromptTemplate[]) => {
    await store.save({ promptTemplates: next })
  }

  /** 提交新建/编辑 */
  const onSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      ElMessage.warning('请填写标题和内容')
      return
    }
    saving.value = true
    try {
      const next = [...list.value]
      if (isEdit.value) {
        next[editingIndex.value] = { ...next[editingIndex.value], title: form.title, content: form.content }
      } else {
        next.push({ id: genTemplateId(), title: form.title, content: form.content })
      }
      await persist(next)
      dialogVisible.value = false
      ElMessage.success(isEdit.value ? '模板已保存' : '模板已创建')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    } finally {
      saving.value = false
    }
  }

  /** 删除模板（二次确认） */
  const onDelete = async (index: number) => {
    try {
      await ElMessageBox.confirm('确定删除该模板吗？', '删除确认', { type: 'warning' })
      const next = list.value.filter((_, i) => i !== index)
      await persist(next)
      ElMessage.success('模板已删除')
    } catch {
      // 用户取消或保存失败（失败已提示）
    }
  }
</script>

<style lang="scss" scoped>
  .cs-pane {
    .cs-tip {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    .pt-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .pt-title {
      font-weight: 500;
    }

    .pt-content {
      display: -webkit-box;
      overflow: hidden;
      color: var(--el-text-color-secondary);
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
</style>
