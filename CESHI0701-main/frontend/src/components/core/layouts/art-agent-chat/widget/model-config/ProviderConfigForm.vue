<!-- 模型配置管理 - 右侧配置详情表单 -->
<template>
  <div class="provider-config-form">
    <div class="form-head">
      <h4 class="section-title">配置详情</h4>
      <ElSwitch v-model="local.enabled" active-text="启用" inactive-text="停用" inline-prompt />
    </div>

    <ElForm ref="formRef" :model="local" :rules="rules" label-position="top" class="cfg-form">
      <ElFormItem label="配置名称" prop="name">
        <ElInput v-model="local.name" placeholder="如 Claude、DeepSeek、公司内部模型" />
      </ElFormItem>

      <div class="form-row">
        <ElFormItem label="模型供应商" prop="provider" class="row-item">
          <ElSelect v-model="local.provider" placeholder="请选择供应商" style="width: 100%">
            <ElOption
              v-for="p in PROVIDER_OPTIONS"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="协议类型" prop="protocolType" class="row-item">
          <ElSelect v-model="local.protocolType" placeholder="请选择协议" style="width: 100%">
            <ElOption
              v-for="p in PROTOCOL_OPTIONS"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </ElSelect>
        </ElFormItem>
      </div>

      <ElFormItem label="API Endpoint" prop="apiEndpoint">
        <ElInput v-model="local.apiEndpoint" placeholder="如 https://api.anthropic.com" />
      </ElFormItem>

      <ElFormItem label="API Key" prop="apiKey">
        <ElInput
          v-model="apiKeyInput"
          type="password"
          show-password
          autocomplete="new-password"
          :placeholder="config.hasApiKey ? '已配置，留空表示不修改' : '请输入 API Key'"
        />
      </ElFormItem>

      <div class="form-row">
        <ElFormItem label="API 版本" class="row-item">
          <ElInput v-model="local.apiVersion" placeholder="非必填，如 2023-06-01" />
        </ElFormItem>
        <div class="row-item"></div>
      </div>

      <ElFormItem label="备注">
        <ElInput
          v-model="local.remark"
          type="textarea"
          :rows="2"
          placeholder="非必填，如用于测试环境、生产环境或内部模型服务"
        />
      </ElFormItem>
    </ElForm>

    <div class="form-actions">
      <ElButton :loading="testing" @click="onTest">测试连接</ElButton>
      <div class="right-actions">
        <ElButton @click="emit('cancel')">取消修改</ElButton>
        <ElButton type="primary" @click="onSave">保存配置</ElButton>
      </div>
    </div>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, reactive, watch } from 'vue'
  import {
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption,
    ElSwitch,
    ElButton,
    ElMessage,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import { PROVIDER_OPTIONS, PROTOCOL_OPTIONS, DRAFT_CONFIG_ID } from '@/store/modules/modelConfig'
  import { testProviderConnection } from '@/api/modelConfig'
  import type { ModelProviderConfig } from '@/types/model'

  defineOptions({ name: 'ProviderConfigForm' })

  const props = defineProps<{
    /** 当前编辑的配置 */
    config: ModelProviderConfig
  }>()

  const emit = defineEmits<{
    /** 保存（传出编辑后的字段快照；apiKey 为空表示不修改） */
    save: [patch: Partial<ModelProviderConfig> & { apiKey?: string }]
    /** 取消修改 */
    cancel: []
  }>()

  const formRef = ref<FormInstance>()
  const testing = ref(false)
  /** API Key 输入框（独立于 local：后端不回显密钥，仅在用户新输入时提交） */
  const apiKeyInput = ref('')

  /** 本地编辑副本，避免直接改动 store */
  const local = reactive<Partial<ModelProviderConfig>>({})

  /** 同步外部配置到本地副本 */
  const syncLocal = (cfg: ModelProviderConfig) => {
    Object.assign(local, {
      name: cfg.name,
      provider: cfg.provider,
      apiEndpoint: cfg.apiEndpoint,
      protocolType: cfg.protocolType,
      apiVersion: cfg.apiVersion ?? '',
      remark: cfg.remark ?? '',
      enabled: cfg.enabled
    })
    // 切换配置时清空密钥输入框（不回显已存密钥）
    apiKeyInput.value = ''
  }

  watch(
    () => props.config.id,
    () => syncLocal(props.config),
    { immediate: true }
  )

  const rules: FormRules = {
    name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
    provider: [{ required: true, message: '请选择供应商', trigger: 'change' }],
    apiEndpoint: [{ required: true, message: '请输入 API Endpoint', trigger: 'blur' }],
    protocolType: [{ required: true, message: '请选择协议类型', trigger: 'change' }]
  }

  /** 测试连接：用后端已存密钥探测（须先保存配置） */
  const onTest = async () => {
    if (props.config.id === DRAFT_CONFIG_ID) {
      return ElMessage.warning('请先保存配置，再测试连接')
    }
    if (!props.config.hasApiKey && !apiKeyInput.value.trim()) {
      return ElMessage.warning('请先保存 API Key，再测试连接')
    }
    testing.value = true
    try {
      const modelId = props.config.models[0]?.modelId
      await testProviderConnection(props.config.id, modelId)
      ElMessage.success('连接测试成功')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '连接测试失败')
    } finally {
      testing.value = false
    }
  }

  /** 保存 */
  const onSave = async () => {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    const key = apiKeyInput.value.trim()
    // trim 文本字段；apiKey 仅在用户新输入时提交（空则后端不修改现有密钥）
    emit('save', {
      ...local,
      name: local.name?.trim(),
      apiEndpoint: local.apiEndpoint?.trim(),
      apiVersion: local.apiVersion?.trim(),
      remark: local.remark?.trim(),
      ...(key ? { apiKey: key } : {})
    })
  }
</script>

<!-- PART_STYLE -->

<style lang="scss" scoped>
  .provider-config-form {
    display: flex;
    flex-direction: column;

    .form-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      .section-title {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--art-text-gray-900);
      }
    }

    .cfg-form {
      .form-row {
        display: flex;
        gap: 16px;

        .row-item {
          flex: 1;
          min-width: 0;
        }
      }
    }

    .form-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      margin-top: 4px;
      border-top: 1px solid var(--art-border-color);

      .right-actions {
        display: flex;
        gap: 12px;
      }
    }
  }
</style>
