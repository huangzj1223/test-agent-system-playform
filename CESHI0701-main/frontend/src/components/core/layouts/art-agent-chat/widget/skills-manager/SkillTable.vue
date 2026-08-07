<!-- Skills 管理台中间区：筛选栏 + 技能表格 + 分页 -->
<template>
  <div class="skill-table">
    <!-- 筛选栏 -->
    <div class="st-filter">
      <ElInput
        v-model="keyword"
        placeholder="搜索 Skill 名称或描述"
        clearable
        class="st-search"
        @keyup.enter="onFilter"
        @clear="onFilter"
      >
        <template #prefix><i class="iconfont-sys">&#xe710;</i></template>
      </ElInput>
      <ElSelect v-model="category" placeholder="类型" clearable class="st-sel" @change="onFilter">
        <ElOption v-for="o in categoryOptions" :key="o.value" :label="o.label" :value="o.value" />
      </ElSelect>
      <ElSelect v-model="riskLevel" placeholder="风险等级" clearable class="st-sel" @change="onFilter">
        <ElOption v-for="o in riskOptions" :key="o.value" :label="o.label" :value="o.value" />
      </ElSelect>
      <ElSelect v-model="status" placeholder="状态" clearable class="st-sel" @change="onFilter">
        <ElOption v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
      </ElSelect>
      <div class="st-spacer"></div>
      <ElButton type="primary" @click="emit('create')">新建 Skill</ElButton>
      <ElButton @click="emit('upload')">导入 Skill</ElButton>
      <ElButton @click="emit('export')">导出全部</ElButton>
    </div>

    <!-- 表格 -->
    <ElTable
      :data="skills"
      v-loading="loading"
      size="small"
      highlight-current-row
      class="st-table"
      @current-change="onRowClick"
    >
      <ElTableColumn label="技能名称" min-width="140">
        <template #default="{ row }">
          <span class="st-name">{{ (row as AgentSkill).name }}</span>
          <ElTag v-if="(row as AgentSkill).builtin" size="small" type="info" class="st-builtin">内置</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="类型" width="100">
        <template #default="{ row }">{{ categoryLabel((row as AgentSkill).category) }}</template>
      </ElTableColumn>
      <ElTableColumn label="风险等级" width="90">
        <template #default="{ row }">
          <ElTag :type="riskMeta((row as AgentSkill).riskLevel).tagType" size="small" effect="light">
            {{ riskMeta((row as AgentSkill).riskLevel).label }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="版本" width="80">
        <template #default="{ row }">{{ (row as AgentSkill).version }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="80">
        <template #default="{ row }">
          <ElSwitch
            :model-value="(row as AgentSkill).enabled"
            size="small"
            @click.stop
            @change="(v) => emit('toggle', row as AgentSkill, Boolean(v))"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="近7日调用" width="90">
        <template #default="{ row }">{{ (row as AgentSkill).calls7d ?? 0 }}</template>
      </ElTableColumn>
      <ElTableColumn label="最近运行" width="100">
        <template #default="{ row }">{{ formatRelativeTime((row as AgentSkill).lastRunAt) }}</template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="120">
        <template #default="{ row }">
          <ElButton type="primary" size="small" link @click.stop="emit('edit', row as AgentSkill)">
            编辑
          </ElButton>
          <ElButton
            v-if="!(row as AgentSkill).builtin"
            type="danger"
            size="small"
            link
            @click.stop="emit('delete', row as AgentSkill)"
          >
            删除
          </ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无 Skill</template>
    </ElTable>

    <!-- 分页 -->
    <div class="st-pager">
      <ElPagination
        layout="total, prev, pager, next"
        :total="pagination.total"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        @current-change="(p: number) => emit('page-change', p)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { ElInput, ElSelect, ElOption, ElButton, ElTable, ElTableColumn, ElTag, ElSwitch, ElPagination } from 'element-plus'
  import type { AgentSkill, SkillCategory, SkillRiskLevel, SkillListQuery, SkillEnums, Pagination } from '@/api/agentSkill'
  import {
    CATEGORY_OPTIONS,
    RISK_OPTIONS,
    STATUS_OPTIONS,
    CATEGORY_LABELS,
    RISK_META,
    formatRelativeTime
  } from './skill-constants'

  defineOptions({ name: 'SkillTable' })

  const props = defineProps<{
    /** 当前页技能 */
    skills: AgentSkill[]
    /** 分页信息 */
    pagination: Pagination
    /** 加载中 */
    loading: boolean
    /** 外部同步的分类筛选（点击左侧栏时同步高亮） */
    categoryFilter: string
    /** 后端下发枚举（分类/风险选项优先用它，空则用本地兜底常量） */
    enums: SkillEnums
  }>()

  /** 分类下拉选项：优先后端枚举，空时用本地兜底 */
  const categoryOptions = computed(() =>
    props.enums.categories.length
      ? props.enums.categories.map((c) => ({ value: c.key, label: c.label }))
      : CATEGORY_OPTIONS
  )
  /** 风险下拉选项：优先后端枚举，空时用本地兜底 */
  const riskOptions = computed(() =>
    props.enums.riskLevels.length
      ? props.enums.riskLevels.map((r) => ({ value: r.key, label: r.label }))
      : RISK_OPTIONS
  )

  const emit = defineEmits<{
    /** 应用筛选 */
    filter: [patch: Partial<SkillListQuery>]
    /** 翻页 */
    'page-change': [page: number]
    /** 选中行（查看详情） */
    select: [skill: AgentSkill]
    /** 新建 */
    create: []
    /** 导入（上传 JSON） */
    upload: []
    /** 导出全部 */
    export: []
    /** 编辑 */
    edit: [skill: AgentSkill]
    /** 删除 */
    delete: [skill: AgentSkill]
    /** 行内切换启用状态 */
    toggle: [skill: AgentSkill, enabled: boolean]
  }>()

  /** 筛选表单本地态 */
  const keyword = ref('')
  const category = ref<SkillCategory | ''>('')
  const riskLevel = ref<SkillRiskLevel | ''>('')
  const status = ref<0 | 1 | ''>('')

  /** 提交筛选（空值转 undefined，交由 store 组装查询） */
  const onFilter = () => {
    emit('filter', {
      keyword: keyword.value || undefined,
      category: category.value || undefined,
      riskLevel: riskLevel.value || undefined,
      status: status.value === '' ? undefined : status.value
    })
  }

  /** 行点击 → 选中查看详情（current-change 可能传 null，需判空） */
  const onRowClick = (row: AgentSkill | null) => {
    if (row) emit('select', row)
  }

  const categoryLabel = (c: SkillCategory) => CATEGORY_LABELS[c] || c
  const riskMeta = (r: SkillRiskLevel) => RISK_META[r] || RISK_META.L1

  // 左侧栏点击分类时，同步本地下拉高亮（父组件传入 categoryFilter）
  defineExpose({
    /** 外部设置分类筛选值（左侧栏联动） */
    setCategory(c: string) {
      category.value = (c as SkillCategory) || ''
    }
  })

  // 消除未使用告警：categoryFilter 通过 defineExpose 的 setCategory 由父组件驱动
  void props.categoryFilter
</script>

<style lang="scss" scoped>
  .skill-table {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .st-filter {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;

    .st-search {
      width: 220px;
    }

    .st-sel {
      width: 120px;
    }

    .st-spacer {
      flex: 1;
    }
  }

  .st-table {
    flex: 1;
    min-height: 0;

    .st-name {
      font-weight: 500;
    }

    .st-builtin {
      margin-left: 6px;
    }
  }

  .st-pager {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
</style>
