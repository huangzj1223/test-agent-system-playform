<!-- 底部输入区：多行输入、（可选）附件、模型选择、发送/停止 -->
<template>
  <div class="agent-chat-input" :class="{ 'is-large': size === 'large' }">
    <!-- 待发送附件预览（仅在允许附件时显示） -->
    <div v-if="allowAttachment && attachments.length" class="attachment-preview">
      <div v-for="att in attachments" :key="att.id" class="attachment-chip">
        <span class="chip-name">{{ att.name }}</span>
        <i class="iconfont-sys remove" @click="emit('remove-attachment', att.id)">&#xe83a;</i>
      </div>
    </div>

    <!-- 多行文本输入（large 变体行数更多） -->
    <ElInput
      ref="inputRef"
      v-model="text"
      type="textarea"
      :autosize="size === 'large' ? { minRows: 3, maxRows: 8 } : { minRows: 2, maxRows: 6 }"
      resize="none"
      placeholder="向智能体提问，Enter 发送，Shift+Enter 换行"
      @keydown="onKeydown"
      @paste="onPaste"
    />

    <!-- 工具行 -->
    <div class="input-toolbar">
      <div class="toolbar-left">
        <!-- 表情选择器：点击弹出分组表情面板，插入到光标处 -->
        <ElPopover trigger="click" placement="top-start" :width="308">
          <template #reference>
            <button class="tool-btn" type="button" aria-label="插入表情">
              <i class="iconfont-sys">&#xe7db;</i>
            </button>
          </template>
          <EmojiPicker @pick="insertEmoji" />
        </ElPopover>

        <!-- 快捷提示词插入（有模板时显示） -->
        <ElDropdown
          v-if="promptTemplates.length"
          trigger="click"
          placement="top-start"
          @command="onInsertTemplate"
        >
          <button class="tool-btn" type="button" aria-label="插入提示词模板">
            <i class="iconfont-sys">&#xe7e7;</i>
          </button>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem v-for="t in promptTemplates" :key="t.id" :command="t.id">
                {{ t.title }}
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>

        <!-- 文件与图片上传（仅在允许附件时显示） -->
        <template v-if="allowAttachment">
          <button class="tool-btn" type="button" aria-label="上传文件或图片" @click="triggerUpload">
            <i class="iconfont-sys">&#xe70a;</i>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            class="hidden-file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            multiple
            @change="onFileChange"
          />
        </template>

        <!-- 模型选择（按供应商分组，来源于已启用配置的已启用模型） -->
        <ModelSelector
          :groups="modelGroups"
          :selection="selection"
          :disabled="isGenerating"
          @select="(pid, mid) => emit('select-model', pid, mid)"
          @open-config="emit('open-config')"
        />
      </div>

      <!-- large 变体右侧附件/语音占位按钮（暂未接后端） -->
      <div v-if="size === 'large'" class="toolbar-right-extra">
        <ElTooltip content="附件（暂未开放）" placement="top">
          <button class="tool-btn" type="button" aria-label="附件" @click="onPlaceholder">
            <i class="iconfont-sys">&#xe70a;</i>
          </button>
        </ElTooltip>
        <ElTooltip content="语音（暂未开放）" placement="top">
          <button class="tool-btn" type="button" aria-label="语音" @click="onPlaceholder">
            <i class="iconfont-sys">&#xe72e;</i>
          </button>
        </ElTooltip>
      </div>

      <!-- 生成中显示停止，否则显示发送 -->
      <button
        v-if="isGenerating"
        class="send-btn is-stop"
        type="button"
        aria-label="停止生成"
        @click="emit('stop')"
      >
        <i class="iconfont-sys">&#xe70c;</i>
        停止
      </button>
      <button
        v-else
        class="send-btn"
        type="button"
        :disabled="!canSend"
        aria-label="发送"
        @click="onSend"
      >
        <i class="iconfont-sys">&#xe758;</i>
        发送
      </button>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed, nextTick } from 'vue'
  import { storeToRefs } from 'pinia'
  import {
    ElInput,
    ElDropdown,
    ElDropdownMenu,
    ElDropdownItem,
    ElMessage,
    ElTooltip,
    ElPopover
  } from 'element-plus'
  import ModelSelector from './ModelSelector.vue'
  import EmojiPicker from './EmojiPicker.vue'
  import { useAgentChatSettingStore } from '@/store/modules/agentChatSetting'
  import type { AgentAttachment } from '@/types/agent'
  import type { AvailableModelGroup, CurrentModelSelection } from '@/types/model'

  defineOptions({ name: 'AgentChatInput' })

  const props = withDefaults(
    defineProps<{
      /** 输入内容（v-model） */
      modelValue: string
      /** 可用模型分组 */
      modelGroups: AvailableModelGroup[]
      /** 当前模型选择 */
      selection: CurrentModelSelection | null
      /** 是否有可用模型 */
      hasModel: boolean
      /** 是否生成中 */
      isGenerating: boolean
      /** 是否允许附件上传（AG-UI 文本链路可关闭） */
      allowAttachment?: boolean
      /** 待发送附件 */
      attachments?: AgentAttachment[]
      /** 尺寸变体：normal 停靠/悬浮；large 全屏工作台大输入框 */
      size?: 'normal' | 'large'
    }>(),
    {
      allowAttachment: true,
      attachments: () => [],
      size: 'normal'
    }
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    /** 选择模型 */
    'select-model': [providerConfigId: number, modelId: number]
    /** 打开模型配置 */
    'open-config': []
    /** 发送消息 */
    send: []
    /** 停止生成 */
    stop: []
    /** 选择文件 */
    'upload-files': [files: File[]]
    /** 移除附件 */
    'remove-attachment': [id: string]
  }>()

  const fileInputRef = ref<HTMLInputElement>()
  /** ElInput 实例引用（用于取内部 textarea 做光标处插入） */
  const inputRef = ref<InstanceType<typeof ElInput>>()

  /** 快捷提示词模板（来自聊天设置 store） */
  const { promptTemplates } = storeToRefs(useAgentChatSettingStore())

  /** 双向绑定输入内容 */
  const text = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v)
  })

  /**
   * 在光标处插入表情，保留原有内容与后续光标位置；取不到 textarea 时回退追加到末尾。
   * @param emoji 待插入的 emoji 字符
   */
  const insertEmoji = (emoji: string) => {
    const el = inputRef.value?.textarea as HTMLTextAreaElement | undefined
    const cur = props.modelValue
    if (!el) {
      text.value = cur + emoji
      return
    }
    const start = el.selectionStart ?? cur.length
    const end = el.selectionEnd ?? cur.length
    text.value = cur.slice(0, start) + emoji + cur.slice(end)
    // 更新后恢复焦点并把光标移到插入内容之后
    nextTick(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    })
  }

  /** 插入提示词模板：追加到当前输入末尾（非空则先补换行），保留用户已输入内容 */
  const onInsertTemplate = (id: string) => {
    const tpl = promptTemplates.value.find((t) => t.id === id)
    if (!tpl) return
    const cur = props.modelValue
    text.value = cur.trim() ? `${cur}\n${tpl.content}` : tpl.content
  }

  /** 是否可发送：非空、不在生成中、且有可用模型 */
  const canSend = computed(
    () => props.modelValue.trim().length > 0 && !props.isGenerating && props.hasModel
  )

  /** 发送 */
  const onSend = () => {
    if (!canSend.value) return
    emit('send')
  }

  /** Enter 发送，Shift+Enter 换行 */
  const onKeydown = (e: Event) => {
    const ke = e as KeyboardEvent
    if (ke.key !== 'Enter' || ke.shiftKey || ke.isComposing) return
    ke.preventDefault()
    onSend()
  }

  /** 触发文件选择 */
  const triggerUpload = () => {
    fileInputRef.value?.click()
  }

  /** 占位功能（附件/语音）：暂未接后端，给出提示 */
  const onPlaceholder = () => {
    ElMessage.info('该功能暂未开放')
  }

  /** 文件选择变化 */
  const onFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    if (files.length) emit('upload-files', files)
    // 清空以允许再次选择同一文件
    input.value = ''
  }

  /** 粘贴图片直接作为附件上传 */
  const onPaste = (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? [])
    const imageFiles = items
      .filter((it) => it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter((f): f is File => f !== null)
    if (imageFiles.length) emit('upload-files', imageFiles)
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .agent-chat-input {
    flex-shrink: 0;
    padding: 12px 16px 14px;
    border-top: 1px solid var(--art-border-color);

    // large 变体：全屏工作台大输入框，去掉上边框，字号更大
    &.is-large {
      padding: 4px 4px 8px;
      border-top: none;

      :deep(.el-textarea__inner) {
        padding: 8px 4px;
        font-size: 15px;
        box-shadow: none;
      }

      .toolbar-right-extra {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-left: auto;
      }

      .send-btn {
        height: 36px;
        padding: 0 18px;
        margin-left: 10px;
        font-size: 14px;
      }
    }

    .attachment-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;

      .attachment-chip {
        display: flex;
        gap: 6px;
        align-items: center;
        max-width: 160px;
        padding: 4px 8px;
        font-size: 12px;
        background: var(--art-gray-100);
        border-radius: 6px;

        .chip-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .remove {
          font-size: 12px;
          color: var(--art-text-gray-500);
          cursor: pointer;

          &:hover {
            color: var(--art-danger);
          }
        }
      }
    }

    .input-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;

      .toolbar-left {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .tool-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        color: var(--art-text-gray-600);
        cursor: pointer;
        background: transparent;
        border: none;
        border-radius: 6px;
        transition:
          background-color 0.2s,
          color 0.2s;

        &:hover {
          color: var(--art-primary);
          background: var(--art-gray-100);
        }

        i {
          font-size: 18px;
        }
      }

      .hidden-file {
        display: none;
      }

      .model-select {
        width: 130px;
      }

      .send-btn {
        display: flex;
        gap: 4px;
        align-items: center;
        height: 32px;
        padding: 0 14px;
        font-size: 13px;
        color: #fff;
        cursor: pointer;
        background: var(--art-primary);
        border: none;
        border-radius: 6px;
        transition: opacity 0.2s;

        &:hover {
          opacity: 0.9;
        }

        &:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        &.is-stop {
          background: var(--art-danger);
        }

        i {
          font-size: 14px;
        }
      }
    }
  }
</style>
