<!-- 界面偏好设置：消息字号、密度、推理过程与工具卡片显隐，改动即保存 -->
<template>
  <div class="cs-pane">
    <ElForm label-position="top">
      <ElFormItem label="消息字号">
        <ElRadioGroup v-model="fontSize" @change="onSave">
          <ElRadioButton value="small">小</ElRadioButton>
          <ElRadioButton value="medium">中</ElRadioButton>
          <ElRadioButton value="large">大</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>

      <ElFormItem label="消息密度">
        <ElRadioGroup v-model="density" @change="onSave">
          <ElRadioButton value="compact">紧凑</ElRadioButton>
          <ElRadioButton value="comfortable">宽松</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>

      <ElFormItem>
        <div class="cs-switch-row">
          <div class="cs-switch-text">
            <span class="cs-switch-label">显示推理过程</span>
            <span class="cs-tip">展示模型的深度思考内容（如 DeepSeek reasoning）</span>
          </div>
          <ElSwitch v-model="showReasoning" @change="onSave" />
        </div>
      </ElFormItem>

      <ElFormItem>
        <div class="cs-switch-row">
          <div class="cs-switch-text">
            <span class="cs-switch-label">显示工具调用卡片</span>
            <span class="cs-tip">展示智能体调用工具的过程与结果卡片</span>
          </div>
          <ElSwitch v-model="showToolCalls" @change="onSave" />
        </div>
      </ElFormItem>
    </ElForm>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { ElForm, ElFormItem, ElRadioGroup, ElRadioButton, ElSwitch, ElMessage } from 'element-plus'
  import { useAgentChatSettingStore } from '@/store/modules/agentChatSetting'
  import type { UiPrefs } from '@/api/agentSetting'

  defineOptions({ name: 'UiPrefsPane' })

  const store = useAgentChatSettingStore()

  const fontSize = ref<UiPrefs['fontSize']>('medium')
  const density = ref<UiPrefs['density']>('comfortable')
  const showReasoning = ref(true)
  const showToolCalls = ref(true)

  /** 从 store 回填 */
  const syncFromStore = () => {
    const p = store.uiPrefs
    fontSize.value = p.fontSize
    density.value = p.density
    showReasoning.value = p.showReasoning
    showToolCalls.value = p.showToolCalls
  }

  watch(() => store.uiPrefs, syncFromStore, { immediate: true, deep: true })

  /** 任一项改动即保存（界面偏好轻量，即时生效体验更好） */
  const onSave = async () => {
    try {
      await store.save({
        uiPrefs: {
          fontSize: fontSize.value,
          density: density.value,
          showReasoning: showReasoning.value,
          showToolCalls: showToolCalls.value
        }
      })
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    }
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .cs-pane {
    max-width: 640px;

    .cs-tip {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    .cs-switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .cs-switch-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cs-switch-label {
      font-size: 14px;
      color: var(--art-text-gray-800);
    }
  }
</style>
