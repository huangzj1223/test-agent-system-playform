<!-- 技能版本历史：列表展示每次变更快照，支持回滚到历史版本 -->
<template>
  <div class="ver-history">
    <ElTable :data="versions" size="small" max-height="240">
      <ElTableColumn label="版本" width="80" prop="version" />
      <ElTableColumn label="变更" width="70">
        <template #default="{ row }">
          <ElTag :type="typeTag((row as SkillVersion).changeType)" size="small">
            {{ typeLabel((row as SkillVersion).changeType) }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="摘要" min-width="120">
        <template #default="{ row }">{{ (row as SkillVersion).changeSummary || '—' }}</template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="70">
        <template #default="{ row }">
          <ElButton
            size="small"
            link
            type="primary"
            :disabled="isCurrent(row as SkillVersion)"
            @click="onRollback(row as SkillVersion)"
          >
            回滚
          </ElButton>
        </template>
      </ElTableColumn>
      <template #empty>暂无版本记录</template>
    </ElTable>
    <div v-if="total > pageSize" class="vh-pager">
      <ElPagination
        layout="prev, pager, next"
        small
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { ElTable, ElTableColumn, ElTag, ElButton, ElPagination, ElMessage, ElMessageBox } from 'element-plus'
  import { fetchSkillVersions, rollbackSkill, type SkillVersion } from '@/api/agentSkill'

  defineOptions({ name: 'SkillVersionHistory' })

  const props = defineProps<{
    /** 技能 ID */
    skillId: number
  }>()

  const emit = defineEmits<{
    /** 回滚成功（通知父级刷新技能列表 + 同步工具） */
    'rolled-back': []
  }>()

  const versions = ref<SkillVersion[]>([])
  const page = ref(1)
  const pageSize = 10
  const total = ref(0)

  /** 拉取版本历史 */
  const load = async (): Promise<void> => {
    try {
      const res = await fetchSkillVersions(props.skillId, page.value, pageSize)
      versions.value = res.data?.list || []
      total.value = res.data?.pagination?.total ?? 0
    } catch {
      versions.value = []
      total.value = 0
    }
  }

  /** 翻页 */
  const onPageChange = (p: number): void => {
    page.value = p
    void load()
  }

  /** 首页为最新版本（倒序第 1 条），当前版本不可回滚到自身 */
  const isCurrent = (v: SkillVersion): boolean =>
    page.value === 1 && versions.value.length > 0 && versions.value[0].id === v.id

  /** 回滚（二次确认） */
  const onRollback = async (v: SkillVersion): Promise<void> => {
    try {
      await ElMessageBox.confirm(`确定回滚到版本 ${v.version}？将生成一条新的回滚记录。`, '回滚确认', {
        type: 'warning'
      })
      await rollbackSkill(props.skillId, v.id)
      ElMessage.success('已回滚')
      page.value = 1
      await load()
      emit('rolled-back')
    } catch {
      // 用户取消或失败（失败已由拦截器提示）
    }
  }

  const typeLabel = (t: string): string =>
    ({ create: '创建', update: '更新', rollback: '回滚' })[t] || t
  const typeTag = (t: string): 'success' | 'warning' | 'info' =>
    ({ create: 'success', update: 'warning', rollback: 'info' })[t] as 'success' | 'warning' | 'info'

  // 技能切换时重置到第 1 页并重新拉取
  watch(
    () => props.skillId,
    () => {
      page.value = 1
      void load()
    },
    { immediate: true }
  )
</script>

<style lang="scss" scoped>
  .vh-pager {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
</style>
