<!-- 模型配置管理弹窗：左右两栏（配置列表 + 配置详情 + 已添加模型） -->
<template>
  <ElDialog
    :model-value="visible"
    title="智能体设置"
    :width="'80vw'"
    top="7vh"
    append-to-body
    :close-on-click-modal="false"
    class="model-config-dialog"
    @update:model-value="emit('update:visible', $event)"
    @open="onDialogOpen"
  >
    <ElTabs v-model="activeTab" class="mc-tabs">
      <ElTabPane label="模型配置" name="model">
        <div class="mc-layout">
          <!-- 左：全部模型卡片列表 -->
          <div class="mc-left">
            <ModelCardList
              :items="cardItems"
              :selected-id="selectedModelId"
              @select="onSelectModel"
              @add="onAddModel"
              @remove="onRemoveModel"
            />
          </div>

          <!-- 中+右：模型配置表单 + 能力/高级配置 -->
          <div class="mc-right">
            <ModelConfigForm
              v-if="showForm"
              :key="formKey"
              :model="editingModel"
              :api-endpoint="editingProvider?.apiEndpoint"
              :has-api-key="editingProvider?.hasApiKey"
              :saving="saving"
              :testing="testing"
              @save="onSaveModel"
              @cancel="onCancelModel"
              @test="onTestModel"
            />
            <div v-else class="mc-empty">请选择左侧模型，或点击「添加模型」新建</div>
          </div>
        </div>
      </ElTabPane>

      <ElTabPane label="Skills 管理" name="skills">
        <SkillsManager />
      </ElTabPane>

      <ElTabPane label="记忆中心" name="memory">
        <MemoryCenter />
      </ElTabPane>

      <ElTabPane label="工具权限" name="tools">
        <ToolPermissionTab />
      </ElTabPane>

      <ElTabPane label="运行日志" name="runlogs">
        <RunLogsTab />
      </ElTabPane>

      <ElTabPane label="安全策略" name="security">
        <SecurityPolicyTab />
      </ElTabPane>
    </ElTabs>
  </ElDialog>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { ElDialog, ElTabs, ElTabPane, ElMessage, ElMessageBox } from 'element-plus'
  import { useModelConfigStore } from '@/store/modules/modelConfig'
  import { useAgentMemoryStore } from '@/store/modules/agentMemory'
  import { useAgentToolStore } from '@/store/modules/agentTool'
  import { testProviderConnection } from '@/api/modelConfig'
  import type { ModelConfig, ModelProviderConfig } from '@/types/model'
  import ModelCardList, { type ModelCardItem } from './model-config/ModelCardList.vue'
  import ModelConfigForm from './model-config/ModelConfigForm.vue'
  import SkillsManager from './SkillsManager.vue'
  import MemoryCenter from './MemoryCenter.vue'
  import ToolPermissionTab from './ToolPermissionTab.vue'
  import RunLogsTab from './RunLogsTab.vue'
  import SecurityPolicyTab from './SecurityPolicyTab.vue'

  defineOptions({ name: 'ModelConfigDialog' })

  defineProps<{
    /** 是否可见 */
    visible: boolean
  }>()

  const emit = defineEmits<{
    'update:visible': [value: boolean]
  }>()

  const store = useModelConfigStore()
  const agentMemoryStore = useAgentMemoryStore()
  const agentToolStore = useAgentToolStore()

  /** 当前激活的设置页签 */
  const activeTab = ref('model')

  // 记忆中心：每次切到该页签都重新拉取（含待确认记忆）。
  // MemoryCenter 在弹窗内 onMounted 只会触发一次（ElDialog 默认不销毁内容），
  // 故对话侧新提交的待确认记忆在重开弹窗后不会自动出现——这里补一次刷新兜住。
  watch(activeTab, (tab) => {
    if (tab === 'memory') void agentMemoryStore.fetchAll()
    // 工具权限：每次切到该页签重新拉取工具清单/统计/分类。
    // 与 MemoryCenter 同理——ElDialog 默认不销毁内容，Tab 内 onMounted 只触发一次，
    // 且聊天面板挂载后异步同步的注册表工具需在此刷新可见，故切换时兜一次 init。
    if (tab === 'tools') void agentToolStore.init()
  })

  /** 当前选中的模型 ID（null 表示未选中或处于新增态） */
  const selectedModelId = ref<number | null>(null)
  /** 是否处于新增态（新增时选中项清空，表单以空白呈现） */
  const isAdding = ref(false)
  /** 保存中 */
  const saving = ref(false)
  /** 测试连接中 */
  const testing = ref(false)

  /** 全部模型卡片项（跨供应商扁平化，标记主用模型） */
  const cardItems = computed<ModelCardItem[]>(() => {
    const sel = store.currentSelection
    const list: ModelCardItem[] = []
    store.configs.forEach((c) => {
      c.models.forEach((m) => {
        list.push({
          model: m,
          providerId: c.id,
          providerLabel: c.name,
          isPrimary: !!sel && sel.providerConfigId === c.id && sel.modelId === m.id
        })
      })
    })
    return list
  })

  /** 当前选中的模型对象 */
  const editingModel = computed<ModelConfig | null>(() => {
    if (isAdding.value || selectedModelId.value === null) return null
    return cardItems.value.find((i) => i.model.id === selectedModelId.value)?.model ?? null
  })

  /** 当前选中模型所属的供应商配置 */
  const editingProvider = computed<ModelProviderConfig | null>(() => {
    if (selectedModelId.value === null) return null
    return store.configs.find((c) => c.models.some((m) => m.id === selectedModelId.value)) ?? null
  })

  /** 是否展示表单（新增态或已选中模型） */
  const showForm = computed(() => isAdding.value || editingModel.value !== null)

  /** 表单重挂 key：切换模型或新增/编辑切换时强制重新回填 */
  const formKey = computed(() => (isAdding.value ? 'new' : `edit-${selectedModelId.value ?? 0}`))

  /** 选中模型 */
  const onSelectModel = (id: number) => {
    isAdding.value = false
    selectedModelId.value = id
  }

  /**
   * 弹窗打开：回到模型配置页签，并自动选中「当前主用模型」。
   * 无主用选择时退回首个可用模型；仍无则保持空态提示添加。
   */
  const onDialogOpen = () => {
    activeTab.value = 'model'
    isAdding.value = false
    const sel = store.currentSelection
    // 优先选中主用模型；校验其仍存在于卡片列表中（配置可能已被删）
    const target =
      (sel && cardItems.value.find((i) => i.model.id === sel.modelId)?.model.id) ??
      cardItems.value[0]?.model.id ??
      null
    selectedModelId.value = target
  }

  /** 添加模型：进入新增态 */
  const onAddModel = () => {
    isAdding.value = true
    selectedModelId.value = null
  }

  /** 取消：退出新增态并清空选中 */
  const onCancelModel = () => {
    isAdding.value = false
    selectedModelId.value = null
  }

  /** 删除模型（二次确认；删除后清空选中） */
  const onRemoveModel = async (id: number) => {
    try {
      await ElMessageBox.confirm('确定删除该模型吗？删除后不可恢复。', '删除确认', {
        type: 'warning'
      })
    } catch {
      return // 用户取消
    }
    try {
      await store.removeModel(id)
      if (selectedModelId.value === id) {
        selectedModelId.value = null
        isAdding.value = false
      }
      ElMessage.success('模型已删除')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '删除失败')
    }
  }

  /** 测试连接（用当前选中模型所属供应商的已存密钥探测） */
  const onTestModel = async () => {
    const provider = editingProvider.value
    const model = editingModel.value
    if (!provider || !model) return
    if (!provider.hasApiKey) {
      ElMessage.warning('该模型尚未配置 API Key，请先保存后再测试')
      return
    }
    testing.value = true
    try {
      await testProviderConnection(provider.id, model.modelId)
      ElMessage.success('连接测试成功')
    } catch (e) {
      ElMessage.error((e as Error)?.message || '连接测试失败')
    } finally {
      testing.value = false
    }
  }

  /** 保存模型（新增走建连接+挂模型，编辑走更新模型+按需更连接） */
  const onSaveModel = async (payload: {
    model: Partial<ModelConfig>
    apiEndpoint: string
    apiKey?: string
  }) => {
    saving.value = true
    try {
      if (editingModel.value && editingProvider.value) {
        await store.updateModelWithConnection(
          editingModel.value.id,
          editingProvider.value.id,
          payload.model,
          { apiEndpoint: payload.apiEndpoint, apiKey: payload.apiKey }
        )
        ElMessage.success('模型已更新')
      } else {
        await store.createModelWithConnection(payload.model, {
          apiEndpoint: payload.apiEndpoint,
          apiKey: payload.apiKey
        })
        ElMessage.success('模型已添加')
        isAdding.value = false
      }
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    } finally {
      saving.value = false
    }
  }
</script>

<!-- PART_STYLE -->

<style lang="scss">
  // 非 scoped：需作用到 ElDialog 根节点尺寸
  .model-config-dialog {
    // 桌面端最小 1000px，窄屏回退到 95vw 防止横向溢出视口
    min-width: min(1000px, 95vw);
    height: 82vh;
    margin-bottom: 0 !important;
    display: flex;
    flex-direction: column;

    .el-dialog__body {
      flex: 1;
      min-height: 0;
      padding: 0 20px 20px;
      overflow: hidden;
    }
  }
</style>

<style lang="scss" scoped>
  .mc-layout {
    display: flex;
    gap: 16px;
    height: 100%;
    min-height: 0;

    .mc-left {
      flex-shrink: 0;
      width: 280px;
      height: 100%;
      padding: 16px;
      overflow: hidden;
      background: var(--art-gray-100);
      border: 1px solid var(--art-border-color);
      border-radius: 10px;
    }

    .mc-right {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      height: 100%;
      min-height: 0;
      padding: 16px 20px;
      border: 1px solid var(--art-border-color);
      border-radius: 10px;

      .mc-empty {
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        color: var(--art-text-gray-500);
      }
    }
  }
</style>
