<!-- 模型配置 - 中栏「模型配置」表单 + 右栏「能力配置 / 高级配置」（新增/编辑共用） -->
<template>
  <div class="model-config-form">
    <!-- 中栏：模型配置 -->
    <div class="mcf-main">
      <h4 class="mcf-title">模型配置</h4>
      <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" class="mcf-form">
        <ElFormItem label="模型名称" prop="name">
          <ElInput v-model="form.name" placeholder="如 Claude 3.5 Sonnet" />
        </ElFormItem>

        <ElFormItem label="模型标识" prop="modelId">
          <ElInput v-model="form.modelId" placeholder="如 claude-3-5-sonnet-20240620" />
        </ElFormItem>

        <ElFormItem label="模型池分组">
          <ElSelect
            v-model="form.poolGroup"
            placeholder="请选择模型池分组"
            filterable
            allow-create
            default-first-option
            style="width: 100%"
          >
            <ElOption v-for="g in POOL_GROUP_OPTIONS" :key="g" :label="g" :value="g" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="API Key">
          <ElInput
            v-model="apiKeyInput"
            :type="apiKeyVisible ? 'text' : 'password'"
            autocomplete="new-password"
            :placeholder="hasApiKey ? '已配置，留空表示不修改' : '请输入 API Key'"
          >
            <!-- 小眼睛：为空且已配置时首次点击拉取已存明文；否则仅切换显隐 -->
            <template #suffix>
              <ElIcon
                v-if="revealing"
                class="mcf-key-eye is-loading"
                aria-label="加载密钥中"
              >
                <Loading />
              </ElIcon>
              <ElIcon
                v-else
                class="mcf-key-eye"
                tabindex="0"
                :aria-label="apiKeyVisible ? '隐藏 API Key' : '显示 API Key'"
                @click="toggleApiKeyVisible"
                @keydown.enter.prevent="toggleApiKeyVisible"
              >
                <View v-if="apiKeyVisible" />
                <Hide v-else />
              </ElIcon>
            </template>
          </ElInput>
        </ElFormItem>

        <ElFormItem label="API 地址" prop="apiEndpoint">
          <ElInput
            v-model="form.apiEndpoint"
            placeholder="如 https://api.anthropic.com/v1/messages"
          />
        </ElFormItem>

        <ElFormItem label="最大上下文长度（Token）">
          <ElInputNumber
            v-model="form.contextWindow"
            :min="1"
            :step="1000"
            controls-position="right"
            placeholder="如 200000"
            style="width: 100%"
          />
        </ElFormItem>

        <!-- 温度：留空=走模型默认；数字框受 0-2 约束，与滑块联动 -->
        <ElFormItem label="默认温度 (Temperature)">
          <div class="mcf-slider">
            <ElInputNumber
              v-model="form.defaultTemperature"
              class="mcf-slider-num"
              :min="0"
              :max="2"
              :step="0.01"
              :controls="false"
              placeholder="默认"
            />
            <ElSlider
              v-model="temperature"
              :min="0"
              :max="2"
              :step="0.01"
              :marks="{ 0: '0', 2: '2' }"
            />
          </div>
        </ElFormItem>

        <!-- Top P：留空=走模型默认；数字框受 0-1 约束，与滑块联动 -->
        <ElFormItem label="默认 Top P">
          <div class="mcf-slider">
            <ElInputNumber
              v-model="form.defaultTopP"
              class="mcf-slider-num"
              :min="0"
              :max="1"
              :step="0.01"
              :controls="false"
              placeholder="默认"
            />
            <ElSlider v-model="topP" :min="0" :max="1" :step="0.01" :marks="{ 0: '0', 1: '1' }" />
          </div>
        </ElFormItem>

        <ElFormItem label="是否启用">
          <ElSwitch
            v-model="form.enabled"
            inline-prompt
            active-text="启用中"
            inactive-text="未启用"
          />
        </ElFormItem>
      </ElForm>
    </div>

    <!-- 右栏：能力配置 + 高级配置 -->
    <div class="mcf-side">
      <div class="mcf-block">
        <div class="mcf-block-head">
          <span class="mcf-block-title">模型能力配置</span>
          <ElTooltip
            content="勾选该模型实际具备的能力，用于对话时按能力路由与展示"
            placement="top"
            :trigger="['hover', 'focus']"
          >
            <ElIcon class="mcf-block-tip" tabindex="0" aria-label="模型能力配置说明">
              <InfoFilled />
            </ElIcon>
          </ElTooltip>
        </div>
        <div class="mcf-caps">
          <label v-for="cap in CAP_ITEMS" :key="cap.key" class="mcf-cap">
            <ElCheckbox v-model="form[cap.key]" />
            <span class="mcf-cap-text">
              <span class="mcf-cap-name">{{ cap.name }}</span>
              <span class="mcf-cap-desc">{{ cap.desc }}</span>
            </span>
          </label>
        </div>
      </div>

      <div class="mcf-block">
        <div class="mcf-block-head">
          <span class="mcf-block-title">高级配置</span>
        </div>
        <ElForm label-position="top" class="mcf-adv">
          <ElFormItem label="超时时间（秒）">
            <ElInputNumber
              v-model="form.timeoutSec"
              :min="1"
              :max="600"
              controls-position="right"
              style="width: 100%"
            />
          </ElFormItem>
          <ElFormItem label="重试次数">
            <ElInputNumber
              v-model="form.retryCount"
              :min="0"
              :max="10"
              controls-position="right"
              style="width: 100%"
            />
          </ElFormItem>
          <p class="mcf-adv-tip">请求超时或失败时，自动重试的次数</p>
        </ElForm>
      </div>
    </div>
  </div>

  <!-- 底部操作栏 -->
  <div class="mcf-actions">
    <!-- 测试连接：仅编辑态可用（需已存密钥） -->
    <ElButton v-if="model" :loading="testing" @click="emit('test')">测试连接</ElButton>
    <div class="mcf-actions-right">
      <ElButton @click="emit('cancel')">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="onSave">保存配置</ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, watch } from 'vue'
  import {
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption,
    ElSlider,
    ElSwitch,
    ElCheckbox,
    ElInputNumber,
    ElButton,
    ElIcon,
    ElTooltip,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import { InfoFilled, View, Hide, Loading } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import { revealProviderKey } from '@/api/modelConfig'
  import type { ModelConfig } from '@/types/model'

  defineOptions({ name: 'ModelConfigForm' })

  const props = defineProps<{
    /** 编辑目标（新增时为 null） */
    model: ModelConfig | null
    /** 该模型所属供应商的 API 地址（编辑时回填） */
    apiEndpoint?: string
    /** 该模型所属供应商是否已配置密钥 */
    hasApiKey?: boolean
    /** 保存中 */
    saving?: boolean
    /** 测试连接中 */
    testing?: boolean
  }>()

  const emit = defineEmits<{
    /** 保存（传出模型字段 + 连接信息） */
    save: [payload: { model: Partial<ModelConfig>; apiEndpoint: string; apiKey?: string }]
    /** 取消 */
    cancel: []
    /** 测试连接 */
    test: []
  }>()

  const formRef = ref<FormInstance>()

  /** 模型池分组预设（可自由输入新值） */
  const POOL_GROUP_OPTIONS = ['通用大模型', '代码模型', '视觉模型', '向量模型', '多模态模型']

  /** 能力项定义（key 对应 ModelConfig 布尔字段） */
  const CAP_ITEMS: { key: CapKey; name: string; desc: string }[] = [
    { key: 'supportText', name: '对话能力', desc: '支持自然语言对话与问答' },
    { key: 'supportCode', name: '代码生成', desc: '支持代码生成与补全' },
    { key: 'supportTools', name: '函数调用', desc: '支持工具与 API 函数调用' },
    { key: 'supportImageInput', name: '多模态理解', desc: '支持图像、文档等多模态输入' },
    { key: 'supportLongText', name: '长文本处理', desc: '支持超长文本理解与生成' }
  ]

  /** 能力布尔字段键 */
  type CapKey =
    'supportText' | 'supportCode' | 'supportTools' | 'supportImageInput' | 'supportLongText'

  /** 表单模型（连接 apiEndpoint 也在其中，apiKey 单独输入） */
  const form = reactive<Partial<ModelConfig> & { apiEndpoint: string }>({
    name: '',
    modelId: '',
    poolGroup: '',
    apiEndpoint: '',
    contextWindow: undefined,
    defaultTemperature: undefined,
    defaultTopP: undefined,
    timeoutSec: 120,
    retryCount: 3,
    supportText: true,
    supportCode: false,
    supportTools: false,
    supportImageInput: false,
    supportImageOutput: false,
    supportStream: true,
    supportLongText: false,
    enabled: true,
    sort: 0
  })

  /** API Key 输入（后端不回显，仅新输入或用户改动揭示值时提交） */
  const apiKeyInput = ref('')
  /** API Key 是否明文可见 */
  const apiKeyVisible = ref(false)
  /** 已从后端揭示明文（用于区分"揭示的旧值"与"用户新输入"） */
  const apiKeyRevealed = ref(false)
  /** 揭示得到的明文快照：用于与当前输入对比判断用户是否改动（比监听 DOM 事件更可靠，覆盖粘贴/自动填充） */
  const revealedSnapshot = ref('')
  /** 揭示请求进行中 */
  const revealing = ref(false)

  /**
   * 切换 API Key 显隐。
   * 当输入为空且该供应商已配置密钥、且尚未揭示时，首次点击向后端拉取明文只读展示；
   * 其余情况仅在明文/密文之间切换显示。
   */
  const toggleApiKeyVisible = async () => {
    // 需要揭示：空输入 + 已配置 + 未揭示过 + 有配置 ID
    const needReveal =
      !apiKeyVisible.value &&
      apiKeyInput.value === '' &&
      !!props.hasApiKey &&
      !apiKeyRevealed.value &&
      !!props.model?.providerConfigId
    if (needReveal) {
      revealing.value = true
      try {
        const res = await revealProviderKey(props.model!.providerConfigId)
        const revealed = res.data?.apiKey ?? ''
        apiKeyInput.value = revealed
        revealedSnapshot.value = revealed // 记录快照，保存时与当前值对比判断是否改动
        apiKeyRevealed.value = true
        apiKeyVisible.value = true
      } catch (e) {
        ElMessage.error((e as Error)?.message || '获取 API Key 失败')
      } finally {
        revealing.value = false
      }
      return
    }
    apiKeyVisible.value = !apiKeyVisible.value
  }

  /** 温度滑块（与数字输入双向；缺省视为 0） */
  const temperature = computed<number>({
    get: () => form.defaultTemperature ?? 0,
    set: (v) => (form.defaultTemperature = v)
  })

  /** Top P 滑块 */
  const topP = computed<number>({
    get: () => form.defaultTopP ?? 0,
    set: (v) => (form.defaultTopP = v)
  })

  /**
   * 模型标识校验：必填 + 禁止空白字符。
   * 模型标识形如 deepseek-chat / claude-3-5-sonnet-20240620，跨供应商均不含空格；
   * 出现空格通常是把连字符误敲成空格（如 "deepseek chat"），会导致上游返回"模型不存在"。
   * 这里拦截并提示，不做自动转换——无法可靠推断用户想要连字符还是无分隔。
   */
  const validateModelId = (
    _rule: unknown,
    value: string,
    callback: (error?: Error) => void
  ): void => {
    const v = (value ?? '').trim()
    if (!v) {
      callback(new Error('请输入模型标识'))
      return
    }
    if (/\s/.test(v)) {
      callback(new Error('模型标识不能包含空格，请检查分隔符是否应为连字符，如 deepseek-chat'))
      return
    }
    callback()
  }

  const rules: FormRules = {
    name: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
    modelId: [{ required: true, validator: validateModelId, trigger: 'blur' }],
    apiEndpoint: [{ required: true, message: '请输入 API 地址', trigger: 'blur' }]
  }

  /**
   * 新增模型的建议默认值（真实填入表单，用户可直接改）。
   * 身份类字段（名称/标识/地址/密钥）因用户专属仍留空，靠占位提示引导。
   */
  const NEW_MODEL_DEFAULTS = {
    contextWindow: 128000,
    defaultTemperature: 0.7,
    defaultTopP: 1,
    timeoutSec: 120,
    retryCount: 3,
    supportText: true,
    supportCode: true,
    supportTools: true,
    supportImageInput: false,
    supportImageOutput: false,
    supportStream: true,
    supportLongText: false
  } as const

  /** 回填表单：编辑态用已存值，新增态用建议默认值 */
  const resetForm = () => {
    const m = props.model
    const isNew = !m
    Object.assign(form, {
      name: m?.name ?? '',
      modelId: m?.modelId ?? '',
      poolGroup: m?.poolGroup ?? '',
      apiEndpoint: props.apiEndpoint ?? '',
      // 数值/能力：编辑态回填已存值（可能为 undefined），新增态填建议默认值
      contextWindow: isNew ? NEW_MODEL_DEFAULTS.contextWindow : m?.contextWindow,
      defaultTemperature: isNew ? NEW_MODEL_DEFAULTS.defaultTemperature : m?.defaultTemperature,
      defaultTopP: isNew ? NEW_MODEL_DEFAULTS.defaultTopP : m?.defaultTopP,
      timeoutSec: m?.timeoutSec ?? NEW_MODEL_DEFAULTS.timeoutSec,
      retryCount: m?.retryCount ?? NEW_MODEL_DEFAULTS.retryCount,
      supportText: m?.supportText ?? NEW_MODEL_DEFAULTS.supportText,
      supportCode: isNew ? NEW_MODEL_DEFAULTS.supportCode : (m?.supportCode ?? false),
      supportTools: isNew ? NEW_MODEL_DEFAULTS.supportTools : (m?.supportTools ?? false),
      supportImageInput: m?.supportImageInput ?? NEW_MODEL_DEFAULTS.supportImageInput,
      supportImageOutput: m?.supportImageOutput ?? NEW_MODEL_DEFAULTS.supportImageOutput,
      supportStream: m?.supportStream ?? NEW_MODEL_DEFAULTS.supportStream,
      supportLongText: m?.supportLongText ?? NEW_MODEL_DEFAULTS.supportLongText,
      enabled: m?.enabled ?? true,
      sort: m?.sort ?? 0
    })
    apiKeyInput.value = ''
    apiKeyVisible.value = false
    apiKeyRevealed.value = false
    revealedSnapshot.value = ''
    formRef.value?.clearValidate()
  }

  // model / 连接变化时重新回填（切换选中模型）
  watch(() => [props.model?.id, props.apiEndpoint], resetForm, { immediate: true })

  /** 数值归一：清空 ElInputNumber 会得到 null，统一成 undefined 以走后端模型默认 */
  const numOrUndefined = (v: number | null | undefined): number | undefined =>
    typeof v === 'number' && !Number.isNaN(v) ? v : undefined

  /** 保存：校验后传出模型字段与连接信息 */
  const onSave = async () => {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    // 揭示的旧密钥若与当前输入一致（用户未改动）则不提交，避免明文回写覆盖；
    // 用快照对比而非监听 DOM 事件，可靠覆盖键入/粘贴/浏览器自动填充
    const unchangedRevealed = apiKeyRevealed.value && apiKeyInput.value === revealedSnapshot.value
    const key = unchangedRevealed ? '' : apiKeyInput.value.trim()
    emit('save', {
      model: {
        name: form.name?.trim(),
        modelId: form.modelId?.trim(),
        poolGroup: form.poolGroup?.trim() || undefined,
        contextWindow: numOrUndefined(form.contextWindow),
        defaultTemperature: numOrUndefined(form.defaultTemperature),
        defaultTopP: numOrUndefined(form.defaultTopP),
        timeoutSec: form.timeoutSec,
        retryCount: form.retryCount,
        supportText: form.supportText,
        supportCode: form.supportCode,
        supportTools: form.supportTools,
        supportImageInput: form.supportImageInput,
        supportImageOutput: form.supportImageOutput,
        supportStream: form.supportStream,
        supportLongText: form.supportLongText,
        enabled: form.enabled,
        sort: form.sort
      },
      apiEndpoint: form.apiEndpoint.trim(),
      ...(key ? { apiKey: key } : {})
    })
  }
</script>

<style lang="scss" scoped>
  .model-config-form {
    display: flex;
    flex: 1;
    gap: 20px;
    min-height: 0;
    overflow-y: auto;
  }

  .mcf-title {
    margin: 0 0 16px;
    font-size: 15px;
    font-weight: 600;
    color: var(--art-text-gray-900);
  }

  .mcf-main {
    flex: 1;
    min-width: 0;
  }

  .mcf-slider {
    display: flex;
    gap: 16px;
    align-items: center;
    width: 100%;

    .mcf-slider-num {
      flex-shrink: 0;
      width: 96px;
    }

    :deep(.el-slider) {
      flex: 1;
    }
  }

  .mcf-side {
    flex-shrink: 0;
    width: 280px;

    .mcf-block {
      padding: 16px;
      margin-bottom: 16px;
      border: 1px solid var(--art-border-color);
      border-radius: 10px;
    }

    .mcf-block-head {
      display: flex;
      gap: 4px;
      align-items: center;
      margin-bottom: 14px;

      .mcf-block-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--art-text-gray-900);
      }

      .mcf-block-tip {
        font-size: 14px;
        color: var(--art-text-gray-400);
      }
    }
  }

  .mcf-caps {
    display: flex;
    flex-direction: column;
    gap: 14px;

    .mcf-cap {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      cursor: pointer;

      .mcf-cap-text {
        display: flex;
        flex-direction: column;

        .mcf-cap-name {
          font-size: 13px;
          color: var(--art-text-gray-900);
        }

        .mcf-cap-desc {
          margin-top: 2px;
          font-size: 12px;
          color: var(--art-text-gray-500);
        }
      }
    }
  }

  .mcf-adv-tip {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--art-text-gray-500);
  }

  // API Key 小眼睛
  .mcf-key-eye {
    color: var(--art-text-gray-500);
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: var(--art-primary);
    }

    &.is-loading {
      cursor: default;
      animation: mcf-eye-spin 0.8s linear infinite;
    }
  }

  @keyframes mcf-eye-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .mcf-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    margin-top: 8px;
    border-top: 1px solid var(--art-border-color);

    // 无测试按钮时（新增态），右侧组仍靠右
    .mcf-actions-right {
      display: flex;
      gap: 12px;
      margin-left: auto;
    }
  }
</style>
