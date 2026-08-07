<!-- 智能体消息块渲染器：按 block.type 分发到对应组件，表格+图表支持查看模式联动 -->
<template>
  <div class="agent-message-renderer">
    <template v-for="(item, idx) in renderItems" :key="idx">
      <!-- 表格 + 图表联动组：顶部视图模式切换 -->
      <div v-if="item.kind === 'data-group'" class="data-group">
        <div class="view-mode-tabs">
          <button
            v-for="m in viewModes"
            :key="m.value"
            class="mode-tab"
            :class="{ 'is-active': groupView(idx) === m.value }"
            type="button"
            @click="setGroupView(idx, m.value)"
          >
            {{ m.label }}
          </button>
        </div>
        <AgentDataTable v-if="groupView(idx) !== 'chart'" :block="item.table!" />
        <AgentChartCard
          v-if="groupView(idx) !== 'table' && item.chart"
          :block="item.chart"
          :initial-type="chartType(item.chart.id)"
          @type-change="(t) => onChartTypeChange(item.chart!.id, t)"
        />
      </div>

      <!-- 单独 markdown -->
      <MarkdownRenderer v-else-if="item.kind === 'markdown'" :content="item.block.content" />

      <!-- 单独表格 -->
      <AgentDataTable v-else-if="item.kind === 'table'" :block="item.block" />

      <!-- 单独图表 -->
      <AgentChartCard
        v-else-if="item.kind === 'chart'"
        :block="item.block"
        :initial-type="chartType(item.block.id)"
        @type-change="(t) => onChartTypeChange(item.block.id, t)"
      />

      <!-- 代码块 -->
      <pre v-else-if="item.kind === 'code'" class="code-block"><code
        v-highlight
        :class="item.block.lang ? `language-${item.block.lang}` : ''"
      >{{ item.block.content }}</code></pre>

      <!-- 错误块 -->
      <el-alert
        v-else-if="item.kind === 'error'"
        :title="item.block.message"
        type="warning"
        :closable="false"
        show-icon
      />
    </template>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import MarkdownRenderer from './markdown/MarkdownRenderer.vue'
  import AgentDataTable from './table/AgentDataTable.vue'
  import AgentChartCard from './chart/AgentChartCard.vue'
  import type {
    MessageBlock,
    TableBlock,
    ChartBlock,
    MarkdownBlock,
    CodeBlock,
    ErrorBlock,
    AgentChartType,
    AgentViewMode
  } from '@/types/agent-message'

  defineOptions({ name: 'AgentMessageRenderer' })

  const props = defineProps<{
    /** 结构化消息块 */
    blocks: MessageBlock[]
  }>()

  /** 渲染项：单块 或 表格+图表联动组 */
  type RenderItem =
    | { kind: 'markdown'; block: MarkdownBlock }
    | { kind: 'table'; block: TableBlock }
    | { kind: 'chart'; block: ChartBlock }
    | { kind: 'code'; block: CodeBlock }
    | { kind: 'error'; block: ErrorBlock }
    | { kind: 'data-group'; table?: TableBlock; chart?: ChartBlock }

  /** 视图模式选项 */
  const viewModes: Array<{ value: AgentViewMode; label: string }> = [
    { value: 'both', label: '表格 + 图表' },
    { value: 'table', label: '表格' },
    { value: 'chart', label: '图表' }
  ]

  /** 各数据组的查看模式（按 renderItems 下标） */
  const groupViews = ref<Record<number, AgentViewMode>>({})
  /** 各图表的当前类型（按 chartId，切换后保留） */
  const chartTypes = ref<Record<string, AgentChartType>>({})

  /** 把 blocks 归并为渲染项：相邻 table→chart 合并为联动组 */
  const renderItems = computed<RenderItem[]>(() => {
    const items: RenderItem[] = []
    const list = props.blocks
    for (let i = 0; i < list.length; i++) {
      const b = list[i]
      const next = list[i + 1]
      // 表格紧跟图表 → 合并为联动组
      if (b.type === 'table' && next?.type === 'chart') {
        items.push({ kind: 'data-group', table: b, chart: next })
        i++ // 跳过已消费的图表
        continue
      }
      switch (b.type) {
        case 'markdown':
          items.push({ kind: 'markdown', block: b })
          break
        case 'table':
          items.push({ kind: 'table', block: b })
          break
        case 'chart':
          items.push({ kind: 'chart', block: b })
          break
        case 'code':
          items.push({ kind: 'code', block: b })
          break
        case 'error':
          items.push({ kind: 'error', block: b })
          break
      }
    }
    return items
  })

  /** 取某组当前视图模式（默认 both） */
  const groupView = (idx: number): AgentViewMode => groupViews.value[idx] || 'both'
  /** 设置某组视图模式（仅前端显示，不重查数据） */
  const setGroupView = (idx: number, mode: AgentViewMode) => {
    groupViews.value[idx] = mode
  }

  /** 取某图表当前类型 */
  const chartType = (id: string): AgentChartType | undefined => chartTypes.value[id]
  /** 保存某图表切换后的类型 */
  const onChartTypeChange = (id: string, t: AgentChartType) => {
    chartTypes.value[id] = t
  }
</script>

<style lang="scss" scoped>
  .agent-message-renderer {
    .data-group {
      margin: 10px 0;
    }

    .view-mode-tabs {
      display: inline-flex;
      gap: 2px;
      padding: 2px;
      margin-bottom: 6px;
      background: var(--art-gray-100);
      border-radius: 8px;

      .mode-tab {
        padding: 3px 12px;
        font-size: 12px;
        color: var(--art-text-gray-600);
        cursor: pointer;
        background: transparent;
        border: none;
        border-radius: 6px;

        &.is-active {
          color: rgb(var(--art-primary));
          background: var(--art-main-bg-color);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
        }
      }
    }

    .code-block {
      max-width: 100%;
      margin: 8px 0;
      overflow-x: auto;
      background: var(--art-gray-100);
      border-radius: 8px;

      code {
        display: block;
        padding: 10px;
        font-size: 12px;
        white-space: pre;
      }
    }
  }
</style>
