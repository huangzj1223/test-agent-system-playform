<!-- 对话参数设置：全局系统提示词（温度/最大输出已迁移到「模型配置」按模型设置） -->
<template>
  <div class="cs-pane">
    <ElForm label-position="top">
      <!-- 系统提示词：设定智能体的角色与回答风格，全局生效 -->
      <ElFormItem label="系统提示词">
        <template #label>
          <span>系统提示词</span>
          <span class="cs-tip">设定智能体的角色与回答风格，对所有模型全局生效</span>
        </template>
        <ElInput
          v-model="systemPrompt"
          type="textarea"
          :rows="6"
          :maxlength="limits.systemPromptMaxLen"
          show-word-limit
          placeholder="例如：你是一名严谨的后端工程师，回答简洁、附代码示例。"
        />
      </ElFormItem>

      <!-- 温度/最大输出迁移说明 -->
      <ElFormItem>
        <ElAlert type="info" :closable="false" show-icon>
          采样温度、Top P、最大输出长度、超时与重试已改为按模型设置，请在「模型配置」页签中为每个模型单独配置。
        </ElAlert>
      </ElFormItem>

      <ElFormItem>
        <ElButton type="primary" :loading="saving" @click="onSave">保存</ElButton>
      </ElFormItem>
    </ElForm>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { ElForm, ElFormItem, ElInput, ElAlert, ElButton, ElMessage } from 'element-plus'
  import { useAgentChatSettingStore } from '@/store/modules/agentChatSetting'

  defineOptions({ name: 'ChatParamsPane' })

  const store = useAgentChatSettingStore()
  /** 业务限制值（驱动系统提示词长度上限），来自后端全局配置 */
  const { limits } = storeToRefs(store)

  /** 系统提示词（全局） */
  const systemPrompt = ref('')
  /** 保存中 */
  const saving = ref(false)

  /** 从 store 回填 */
  const syncFromStore = () => {
    systemPrompt.value = store.chatParams.systemPrompt || ''
  }

  // store 初始化拉取可能晚于组件挂载，监听同步
  watch(() => store.chatParams, syncFromStore, { immediate: true, deep: true })

  /** 保存系统提示词（温度等已不在此处管理） */
  const onSave = async () => {
    saving.value = true
    try {
      await store.save({ chatParams: { systemPrompt: systemPrompt.value } })
      ElMessage.success('已保存')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    } finally {
      saving.value = false
    }
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .cs-pane {
    max-width: 640px;

    .cs-tip {
      margin-left: 8px;
      font-size: 12px;
      font-weight: 400;
      color: var(--el-text-color-secondary);
    }
  }
</style>
