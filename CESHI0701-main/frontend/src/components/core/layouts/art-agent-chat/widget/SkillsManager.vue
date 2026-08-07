<!-- Skills 管理台：统计卡片 + 分类侧栏 + 筛选表格 + 详情面板，接真实后端 -->
<template>
  <div class="skills-console">
    <!-- 顶部统计卡片 -->
    <SkillStatCards :stats="store.stats" />

    <!-- 主体：左侧分类 | 中间表格 | 右侧详情 -->
    <div class="sc-body">
      <SkillCategorySidebar
        :data="store.categories"
        :active="activeCategory"
        @select="onCategorySelect"
      />

      <SkillTable
        ref="tableRef"
        :skills="store.skills"
        :pagination="store.pagination"
        :loading="store.loading"
        :category-filter="activeCategory"
        :enums="store.enums"
        @filter="onFilter"
        @page-change="store.changePage"
        @select="store.select"
        @create="openCreate"
        @upload="onUpload"
        @edit="openEdit"
        @delete="onDelete"
        @toggle="onToggle"
        @export="onExport"
      />

      <SkillDetailPanel
        :skill="store.selected"
        :enums="store.enums"
        :catalog="store.catalog"
        @edit="openEdit"
        @toggle="onToggle"
        @rolled-back="onRolledBack"
      />
    </div>

    <!-- 隐藏文件选择（导入 JSON 用） -->
    <input ref="fileInput" type="file" accept="application/json,.json" class="sc-file" @change="onFilePicked" />

    <!-- 新建/编辑弹窗 -->
    <SkillEditDialog
      v-model:visible="dialogVisible"
      :editing="editing"
      :catalog="store.catalog"
      :enums="store.enums"
      @create="onCreate"
      @update="onUpdate"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useAgentSkillStore } from '@/store/modules/agentSkill'
  import { syncSkillTools } from '@/agent/skills/skill-tools'
  import { exportSkills, importSkills, type AgentSkill, type SkillListQuery, type CreateSkillPayload, type UpdateSkillPayload, type PortableSkill } from '@/api/agentSkill'
  import SkillStatCards from './skills-manager/SkillStatCards.vue'
  import SkillCategorySidebar from './skills-manager/SkillCategorySidebar.vue'
  import SkillTable from './skills-manager/SkillTable.vue'
  import SkillDetailPanel from './skills-manager/SkillDetailPanel.vue'
  import SkillEditDialog from './skills-manager/SkillEditDialog.vue'

  defineOptions({ name: 'SkillsManager' })

  const store = useAgentSkillStore()

  /** 当前分类筛选（空串=全部，供侧栏高亮） */
  const activeCategory = ref('')
  /** 表格组件引用（用于左侧栏联动下拉高亮） */
  const tableRef = ref<InstanceType<typeof SkillTable>>()
  /** 弹窗可见与编辑目标 */
  const dialogVisible = ref(false)
  const editing = ref<AgentSkill | null>(null)

  /** 左侧分类点击：更新筛选并同步表格下拉高亮 */
  const onCategorySelect = (category: string) => {
    activeCategory.value = category
    tableRef.value?.setCategory(category)
    void store.applyFilter({ category: (category || undefined) as SkillListQuery['category'] })
  }

  /** 表格筛选栏提交：分类同步到侧栏高亮 */
  const onFilter = (patch: Partial<SkillListQuery>) => {
    activeCategory.value = patch.category ?? ''
    void store.applyFilter(patch)
  }

  /** 打开新建 */
  const openCreate = () => {
    editing.value = null
    dialogVisible.value = true
  }

  /** 打开编辑 */
  const openEdit = (skill: AgentSkill) => {
    editing.value = skill
    dialogVisible.value = true
  }

  /** 隐藏文件输入引用 */
  const fileInput = ref<HTMLInputElement>()

  /** 导入：触发文件选择 */
  const onUpload = () => {
    fileInput.value?.click()
  }

  /** 选中文件后：解析 JSON → 导入 → 报告结果 */
  const onFilePicked = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const items: PortableSkill[] = Array.isArray(parsed) ? parsed : parsed.items
      if (!Array.isArray(items) || !items.length) {
        ElMessage.warning('文件内容为空或格式不符（应为技能数组）')
        return
      }
      const res = await importSkills(items, 'skip')
      const r = res.data
      if (r) {
        const parts = [`新增 ${r.imported}`, `跳过 ${r.skipped}`, `覆盖 ${r.updated}`, `重命名 ${r.renamed}`]
        if (r.failed.length) parts.push(`失败 ${r.failed.length}`)
        ElMessage.success(`导入完成：${parts.join('，')}`)
      }
      await store.refreshAll()
      await syncSkillTools()
    } catch (err) {
      ElMessage.error((err as Error)?.message?.includes('JSON') ? '文件不是合法 JSON' : (err as Error)?.message || '导入失败')
    } finally {
      // 清空以便再次选择同一文件也能触发 change
      input.value = ''
    }
  }

  /** 导出全部技能为 JSON 文件 */
  const onExport = async () => {
    try {
      const res = await exportSkills()
      const blob = new Blob([JSON.stringify(res.data ?? [], null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `skills-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      ElMessage.error((e as Error)?.message || '导出失败')
    }
  }

  /** 新建提交 */
  const onCreate = async (payload: CreateSkillPayload) => {
    try {
      await store.create(payload)
      dialogVisible.value = false
      ElMessage.success('Skill 已创建')
      await syncSkillTools()
    } catch (e) {
      ElMessage.error((e as Error)?.message || '创建失败')
    }
  }

  /** 更新提交 */
  const onUpdate = async (payload: UpdateSkillPayload) => {
    try {
      await store.update(payload)
      dialogVisible.value = false
      ElMessage.success('Skill 已保存')
      await syncSkillTools()
    } catch (e) {
      ElMessage.error((e as Error)?.message || '保存失败')
    }
  }

  /** 版本回滚成功：刷新概览并同步聊天工具（回滚可能改了 enabled/capabilities） */
  const onRolledBack = async () => {
    await store.refreshAll()
    await syncSkillTools()
  }

  /** 切换启用 */
  const onToggle = async (skill: AgentSkill, enabled: boolean) => {
    try {
      await store.toggle(skill.id, enabled)
      await syncSkillTools()
    } catch (e) {
      ElMessage.error((e as Error)?.message || '操作失败')
    }
  }

  /** 删除（二次确认） */
  const onDelete = async (skill: AgentSkill) => {
    try {
      await ElMessageBox.confirm(`确定删除 Skill「${skill.name}」？`, '删除确认', { type: 'warning' })
      await store.remove(skill.id)
      ElMessage.success('Skill 已删除')
      await syncSkillTools()
    } catch {
      // 用户取消或删除失败（失败已提示）
    }
  }

  onMounted(() => {
    void store.refreshAll()
    void store.loadCatalog()
    void store.loadEnums()
  })
</script>

<style lang="scss" scoped>
  .skills-console {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .sc-body {
    display: flex;
    flex: 1;
    gap: 12px;
    min-height: 0;
  }

  .sc-file {
    display: none;
  }
</style>
