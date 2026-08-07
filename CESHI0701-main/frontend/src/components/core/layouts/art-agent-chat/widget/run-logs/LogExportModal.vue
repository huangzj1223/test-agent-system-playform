<!-- 日志导出弹窗：范围 / 类型 / 是否含详情 / 是否含敏感信息 + 模拟导出 -->
<template>
  <ElDialog
    :model-value="visible"
    title="导出日志"
    width="460px"
    top="12vh"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <ElForm label-width="120px" label-position="left">
      <ElFormItem label="导出范围">
        <ElRadioGroup v-model="form.scope">
          <ElRadio value="filtered">当前筛选结果</ElRadio>
          <ElRadio value="all">全部日志</ElRadio>
          <ElRadio value="range">指定时间范围</ElRadio>
        </ElRadioGroup>
      </ElFormItem>

      <ElFormItem v-if="form.scope === 'range'" label="时间范围">
        <ElDatePicker
          v-model="form.dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 100%"
        />
      </ElFormItem>

      <ElFormItem label="导出类型">
        <ElSelect v-model="form.format" style="width: 100%">
          <ElOption label="CSV" value="csv" />
          <ElOption label="JSON" value="json" />
          <ElOption label="Excel" value="excel" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="包含详情">
        <ElSwitch v-model="form.includeDetail" />
      </ElFormItem>

      <ElFormItem label="包含敏感信息">
        <ElSwitch v-model="form.includeSensitive" />
        <span class="le-tip">默认不导出，请谨慎开启</span>
      </ElFormItem>
    </ElForm>

    <template #footer>
      <ElButton @click="emit('update:visible', false)">取消</ElButton>
      <ElButton type="primary" @click="onExport">导出</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { reactive } from 'vue'
  import {
    ElDialog, ElForm, ElFormItem, ElRadioGroup, ElRadio,
    ElDatePicker, ElSelect, ElOption, ElSwitch, ElButton, ElMessage
  } from 'element-plus'

  defineOptions({ name: 'LogExportModal' })

  defineProps<{
    /** 是否可见 */
    visible: boolean
  }>()

  const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

  /** 导出表单 */
  const form = reactive({
    /** 导出范围 */
    scope: 'filtered' as 'filtered' | 'all' | 'range',
    /** 指定时间范围 */
    dateRange: null as [string, string] | null,
    /** 导出类型 */
    format: 'csv' as 'csv' | 'json' | 'excel',
    /** 是否含详情 */
    includeDetail: true,
    /** 是否含敏感信息（默认否） */
    includeSensitive: false
  })

  /** 模拟导出：提示成功并关闭弹窗（不生成真实文件） */
  const onExport = () => {
    ElMessage.success('日志导出任务已创建')
    emit('update:visible', false)
  }
</script>

<style lang="scss" scoped>
  .le-tip {
    margin-left: 10px;
    font-size: 12px;
    color: var(--art-text-gray-500);
  }
</style>
