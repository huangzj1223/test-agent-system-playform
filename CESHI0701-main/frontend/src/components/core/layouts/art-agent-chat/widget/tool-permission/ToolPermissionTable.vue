<!-- 工具权限中间区：筛选栏 + 工具表格 + 分页 -->
<template>
  <div class="tool-table">
    <!-- 筛选栏 -->
    <div class="tt-filter">
      <ElInput
        v-model="keyword"
        placeholder="搜索工具名称、描述"
        clearable
        class="tt-search"
        @keyup.enter="onFilter"
        @clear="onFilter"
      >
        <template #prefix><i class="iconfont-sys">&#xe710;</i></template>
      </ElInput>
      <ElSelect v-model="type" placeholder="类型: 全部" clearable class="tt-sel" @change="onFilter">
        <ElOption v-for="o in TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
      </ElSelect>
      <ElSelect v-model="riskLevel" placeholder="风险等级: 全部" clearable class="tt-sel" @change="onFilter">
        <ElOption v-for="o in RISK_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
      </ElSelect>
      <ElSelect v-model="status" placeholder="状态: 全部" clearable class="tt-sel" @change="onFilter">
        <ElOption v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
      </ElSelect>
      <div class="tt-spacer"></div>
      <ElButton type="primary" @click="emit('create')">
        <i class="iconfont-sys tt-plus">&#xe7d8;</i>新建工具
      </ElButton>
    </div>

    <!-- 表格 -->
    <ElTable :data="tools" size="small" class="tt-table">
      <ElTableColumn label="工具名称" min-width="180">
        <template #default="{ row }">
          <div class="tt-name-cell">
            <i class="iconfont-sys tt-name-icon" v-html="iconOf((row as AgentTool).type)"></i>
            <span class="tt-name">{{ (row as AgentTool).name }}</span>
          </div>
        </template>
      </ElTableColumn>
      <ElTableColumn label="类型" width="110">
        <template #default="{ row }">
          <ElTag size="small" effect="plain">{{ typeLabel((row as AgentTool).type) }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="描述" min-width="200" show-overflow-tooltip prop="description" />
      <ElTableColumn label="风险等级" width="100">
        <template #default="{ row }">
          <ElTag
            :type="riskMeta((row as AgentTool).riskLevel).tagType"
            size="small"
            effect="light"
            :class="riskMeta((row as AgentTool).riskLevel).className"
          >
            {{ riskMeta((row as AgentTool).riskLevel).label }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="70">
        <template #default="{ row }">
          <ElSwitch
            :model-value="(row as AgentTool).enabled"
            @change="(v: string | number | boolean) => emit('toggle', row as AgentTool, Boolean(v))"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="210">
        <template #default="{ row }">
          <div class="tt-op-cell">
            <ElButton type="primary" size="small" link @click="emit('config', row as AgentTool)">配置</ElButton>
            <ElButton type="primary" size="small" link @click="emit('test', row as AgentTool)">测试</ElButton>
            <ElButton type="primary" size="small" link @click="emit('log', row as AgentTool)">日志</ElButton>
            <ElDropdown trigger="click" @command="(cmd: string) => onMore(cmd, row as AgentTool)">
              <ElButton type="primary" size="small" link>更多<i class="iconfont-sys tt-more">&#xe6df;</i></ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="duplicate">复制工具</ElDropdownItem>
                  <ElDropdownItem command="disable" divided>{{ (row as AgentTool).enabled ? '禁用' : '启用' }}</ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
        </template>
      </ElTableColumn>
      <template #empty>暂无工具</template>
    </ElTable>

    <!-- 分页 -->
    <div class="tt-pager">
      <ElPagination
        layout="total, prev, pager, next, sizes"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        @current-change="(p: number) => emit('page-change', p)"
        @size-change="(s: number) => emit('size-change', s)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import {
    ElInput, ElSelect, ElOption, ElButton, ElTable, ElTableColumn,
    ElTag, ElSwitch, ElPagination, ElDropdown, ElDropdownMenu, ElDropdownItem
  } from 'element-plus'
  import {
    TYPE_OPTIONS, RISK_OPTIONS, STATUS_OPTIONS, TYPE_LABELS, TYPE_ICONS, RISK_META,
    type AgentTool, type ToolType, type RiskLevel
  } from './types'

  defineOptions({ name: 'ToolPermissionTable' })

  const props = defineProps<{
    /** 当前页工具 */
    tools: AgentTool[]
    /** 过滤后总数 */
    total: number
    /** 当前页码 */
    page: number
    /** 每页条数 */
    pageSize: number
    /** 外部同步的分类（左侧栏点击时联动类型下拉高亮） */
    activeCategory: string
  }>()

  const emit = defineEmits<{
    /** 应用筛选 */
    filter: [patch: { keyword?: string; type?: ToolType | ''; riskLevel?: RiskLevel | ''; status?: 'enabled' | 'disabled' | '' }]
    /** 翻页 */
    'page-change': [page: number]
    /** 改每页条数 */
    'size-change': [size: number]
    /** 新建 */
    create: []
    /** 配置 */
    config: [tool: AgentTool]
    /** 测试 */
    test: [tool: AgentTool]
    /** 日志 */
    log: [tool: AgentTool]
    /** 切换启用 */
    toggle: [tool: AgentTool, enabled: boolean]
    /** 复制工具 */
    duplicate: [tool: AgentTool]
  }>()

  /** 筛选表单本地态 */
  const keyword = ref('')
  const type = ref<ToolType | ''>('')
  const riskLevel = ref<RiskLevel | ''>('')
  const status = ref<'enabled' | 'disabled' | ''>('')

  /** 提交筛选（空值转 undefined，交由 store 组装） */
  const onFilter = () => {
    emit('filter', {
      keyword: keyword.value || '',
      type: type.value || '',
      riskLevel: riskLevel.value || '',
      status: status.value || ''
    })
  }

  /** 更多下拉命令：复制 / 启用禁用切换 */
  const onMore = (cmd: string, tool: AgentTool) => {
    if (cmd === 'duplicate') emit('duplicate', tool)
    if (cmd === 'disable') emit('toggle', tool, !tool.enabled)
  }

  const typeLabel = (t: ToolType) => TYPE_LABELS[t] || t
  const iconOf = (t: ToolType) => TYPE_ICONS[t] || TYPE_ICONS.cli
  const riskMeta = (r: RiskLevel) => RISK_META[r] || RISK_META.L1

  // 左侧栏点击分类时，同步类型下拉高亮
  watch(
    () => props.activeCategory,
    (c) => {
      type.value = (c as ToolType) || ''
    }
  )
</script>

<style lang="scss" scoped>
  .tool-table {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    height: 100%;
    min-height: 0;
    padding: 16px;
    background: var(--art-main-bg-color);
    border: 1px solid var(--art-border-color);
    border-radius: 10px;
  }

  .tt-filter {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;

    .tt-search {
      width: 200px;
    }

    .tt-sel {
      width: 140px;
    }

    .tt-spacer {
      flex: 1;
    }

    .tt-plus {
      margin-right: 4px;
      font-size: 13px;
    }
  }

  .tt-table {
    flex: 1;
    min-height: 0;

    .tt-name-cell {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .tt-name-icon {
      font-size: 16px;
      color: var(--art-text-gray-500);
    }

    .tt-name {
      font-weight: 500;
    }

    // 操作列：四个操作项单行排列，不换行、间距均匀
    .tt-op-cell {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 4px;
      white-space: nowrap;

      :deep(.el-button + .el-button) {
        margin-left: 0;
      }
    }

    .tt-more {
      margin-left: 2px;
      font-size: 12px;
    }

    // L4 深红：在 danger 基础上加深，区别于 L3
    :deep(.risk-l4) {
      color: #7f1d1d;
      background: rgba(127, 29, 29, 0.12);
      border-color: rgba(127, 29, 29, 0.3);
    }
  }

  .tt-pager {
    display: flex;
    flex-shrink: 0;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>

