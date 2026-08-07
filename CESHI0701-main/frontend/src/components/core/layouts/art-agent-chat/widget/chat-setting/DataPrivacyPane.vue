<!-- 数据与隐私：导出全部会话、清空全部历史 -->
<template>
  <div class="cs-pane">
    <!-- 导出 -->
    <div class="dp-item">
      <div class="dp-text">
        <span class="dp-label">导出全部会话</span>
        <span class="cs-tip">将你的全部历史会话打包为 JSON 文件下载到本地</span>
      </div>
      <ElButton :loading="exporting" @click="onExport">导出</ElButton>
    </div>

    <!-- 清空 -->
    <div class="dp-item dp-danger">
      <div class="dp-text">
        <span class="dp-label">清空全部历史</span>
        <span class="cs-tip">删除你的全部历史会话，操作不可撤销</span>
      </div>
      <ElButton type="danger" :loading="clearing" @click="onClear">清空</ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { ElButton, ElMessage, ElMessageBox } from 'element-plus'
  import {
    fetchConversationList,
    fetchConversationDetail,
    clearConversations
  } from '@/api/agentConversation'
  import { useAiChatStore } from '@/store/modules/aiChat'

  defineOptions({ name: 'DataPrivacyPane' })

  const chatStore = useAiChatStore()
  const exporting = ref(false)
  const clearing = ref(false)

  /** 导出：拉取列表→逐个取详情→打包 JSON→浏览器下载 */
  const onExport = async () => {
    exporting.value = true
    try {
      const listRes = await fetchConversationList()
      const metas = listRes.data || []
      if (!metas.length) {
        ElMessage.warning('暂无可导出的会话')
        return
      }
      // 分批拉详情（含消息），限制并发避免会话过多时压垮后端；失败的跳过不阻断整体
      const BATCH_SIZE = 6
      const details: unknown[] = []
      for (let i = 0; i < metas.length; i += BATCH_SIZE) {
        const batch = metas.slice(i, i + BATCH_SIZE)
        const settled = await Promise.all(
          batch.map(async (m) => {
            try {
              const res = await fetchConversationDetail(m.threadId)
              return res.data
            } catch {
              return null
            }
          })
        )
        details.push(...settled)
      }
      const payload = {
        exportedAt: new Date().toISOString(),
        conversations: details.filter(Boolean)
      }
      downloadJson(payload, `ai-conversations-${Date.now()}.json`)
      ElMessage.success(`已导出 ${payload.conversations.length} 个会话`)
    } catch (e) {
      ElMessage.error((e as Error)?.message || '导出失败')
    } finally {
      exporting.value = false
    }
  }

  /** 触发浏览器下载 JSON（用 Blob + 临时链接，用完即回收） */
  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 清空全部历史（二次确认）；成功后重置本地会话列表并新建空会话 */
  const onClear = async () => {
    try {
      await ElMessageBox.confirm('将删除你的全部历史会话，操作不可撤销，是否继续？', '清空确认', {
        type: 'warning',
        confirmButtonText: '清空',
        confirmButtonClass: 'el-button--danger'
      })
    } catch {
      return // 用户取消
    }
    clearing.value = true
    try {
      const res = await clearConversations()
      // 清空后端后同步前端：刷新会话列表 + 开新线程，避免残留已删会话
      await chatStore.newThread()
      await chatStore.initSessions()
      ElMessage.success(`已清空 ${res.data?.removed ?? 0} 个会话`)
    } catch (e) {
      ElMessage.error((e as Error)?.message || '清空失败')
    } finally {
      clearing.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .cs-pane {
    max-width: 640px;

    .cs-tip {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    .dp-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      margin-bottom: 12px;
      border: 1px solid var(--art-border-color);
      border-radius: 10px;
    }

    .dp-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dp-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--art-text-gray-800);
    }

    .dp-danger .dp-label {
      color: var(--art-danger);
    }
  }
</style>
