<!-- 运行日志顶部筛选区：搜索 + 日期范围 + 智能体 + 状态 + 导出按钮 -->
<template>
  <div class="log-filter">
    <!-- 关键词搜索 -->
    <ElInput
      v-model="keyword"
      placeholder="搜索内容或关键词"
      clearable
      class="lf-search"
      @keyup.enter="onFilter"
      @clear="onFilter"
    >
      <template #prefix><i class="iconfont-sys">&#xe710;</i></template>
    </ElInput>

    <!-- 日期范围 -->
    <ElDatePicker
      v-model="dateRange"
      type="daterange"
      value-format="YYYY-MM-DD"
      range-separator="-"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      class="lf-date"
      @change="onFilter"
    />

    <!-- 智能体筛选 -->
    <ElSelect v-model="agent" placeholder="智能体筛选" clearable class="lf-sel" @change="onFilter">
      <ElOption v-for="o in AGENT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
    </ElSelect>

    <!-- 状态筛选 -->
    <ElSelect v-model="status" placeholder="状态筛选" clearable class="lf-sel" @change="onFilter">
      <ElOption v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
    </ElSelect>

    <div class="lf-spacer"></div>

    <!-- 导出日志 -->
    <ElButton @click="emit('export')">
      <i class="iconfont-sys lf-export-icon">&#xe6b1;</i>导出日志
    </ElButton>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { ElInput, ElDatePicker, ElSelect, ElOption, ElButton } from 'element-plus'
  import { AGENT_OPTIONS } from './mockRunLogs'
  import { STATUS_OPTIONS, type LogStatus, type RunLogFilter } from './runLogTypes'

  defineOptions({ name: 'LogFilterBar' })

  const emit = defineEmits<{
    /** 应用筛选 */
    filter: [patch: Partial<RunLogFilter>]
    /** 打开导出弹窗 */
    export: []
  }>()

  /** 筛选表单本地态 */
  const keyword = ref('')
  const dateRange = ref<[string, string] | null>(null)
  const agent = ref('')
  const status = ref<LogStatus | ''>('')

  /** 提交筛选（空值归一，交由 store 组装） */
  const onFilter = () => {
    emit('filter', {
      keyword: keyword.value || '',
      dateRange: dateRange.value,
      agent: agent.value || '',
      status: status.value || ''
    })
  }
</script>

<style lang="scss" scoped>
  .log-filter {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;

    .lf-search {
      width: 220px;
    }

    .lf-date {
      width: 260px;
    }

    .lf-sel {
      width: 150px;
    }

    .lf-spacer {
      flex: 1;
    }

    .lf-export-icon {
      margin-right: 4px;
      font-size: 14px;
    }
  }
</style>
