<!-- 智能体数据表格：数字右对齐 / 空值显示"-" / 表头吸顶 / 横向滚动 / 超 100 条分页 -->
<template>
  <div class="agent-data-table">
    <div v-if="block.title" class="table-title">{{ block.title }}</div>
    <div v-if="!block.rows.length" class="table-empty">
      <el-empty description="暂无数据" :image-size="50" />
    </div>
    <template v-else>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th
                v-for="col in block.columns"
                :key="col.key"
                :class="{ 'align-right': col.dataType === 'number' }"
              >
                {{ col.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in pagedRows" :key="ri">
              <td
                v-for="col in block.columns"
                :key="col.key"
                :class="{ 'align-right': col.dataType === 'number' }"
              >
                {{ cellText(row[col.key]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- 超阈值分页 -->
      <div v-if="needPaging" class="table-pager">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="block.rows.length"
          layout="prev, pager, next, total"
          small
          background
        />
      </div>
    </template>
  </div>
</template>

<!-- PART_SCRIPT -->

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { TableBlock } from '@/types/agent-message'

  defineOptions({ name: 'AgentDataTable' })

  const props = defineProps<{
    /** 结构化表格块 */
    block: TableBlock
  }>()

  /** 超过此行数启用分页 */
  const PAGE_THRESHOLD = 100
  /** 每页行数 */
  const pageSize = 20
  /** 当前页 */
  const currentPage = ref(1)

  /** 是否需要分页 */
  const needPaging = computed(() => props.block.rows.length > PAGE_THRESHOLD)

  /** 当前页数据（不分页时返回全部） */
  const pagedRows = computed(() => {
    if (!needPaging.value) return props.block.rows
    const start = (currentPage.value - 1) * pageSize
    return props.block.rows.slice(start, start + pageSize)
  })

  /** 单元格文本：空值统一显示"-" */
  const cellText = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined || v === '') return '-'
    return String(v)
  }
</script>

<style lang="scss" scoped>
  .agent-data-table {
    margin: 10px 0;

    .table-title {
      margin-bottom: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    // 横向滚动容器 + 表头吸顶
    .table-scroll {
      max-width: 100%;
      max-height: 360px;
      overflow: auto;
      border: 1px solid var(--art-border-color);
      border-radius: 8px;
    }

    .data-table {
      width: 100%;
      font-size: 12px;
      border-collapse: collapse;

      th,
      td {
        padding: 6px 10px;
        text-align: left;
        white-space: nowrap;
        border-bottom: 1px solid var(--art-border-color);

        &.align-right {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
      }

      // 长文本单元格允许换行（去 nowrap，设最小可读宽度）
      td {
        max-width: 260px;
        white-space: normal;
        word-break: break-word;
        color: var(--art-text-gray-800);
      }

      thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        font-weight: 600;
        color: var(--art-text-gray-700);
        white-space: nowrap;
        background: var(--art-gray-100); // 表头浅灰背景
      }

      tbody tr:hover {
        background: var(--art-gray-100);
      }
    }

    .table-empty {
      padding: 12px 0;
    }

    .table-pager {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
  }
</style>
