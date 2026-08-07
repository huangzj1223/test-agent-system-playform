<!-- 黑白名单：命令白名单/命令黑名单/目录白名单/API·DB黑名单 4 区 -->
<template>
  <div class="bwl-panel">
    <div class="bwl-head">
      <span class="bwl-title">黑白名单</span>
      <span class="bwl-desc">配置智能体可以访问或禁止访问的命令、接口、目录、数据库表和页面路径</span>
    </div>

    <ListSection
      title="命令白名单"
      value-label="命令模板"
      :items="bwl.commandWhitelist"
      :show-risk="true"
      @save="(item) => store.saveListItem('commandWhitelist', item)"
      @remove="(id) => store.removeListItem('commandWhitelist', id)"
      @toggle="(id, e) => store.toggleListItem('commandWhitelist', id, e)"
    />
    <ListSection
      title="命令黑名单"
      value-label="命令模板"
      :items="bwl.commandBlacklist"
      :show-risk="true"
      @save="(item) => store.saveListItem('commandBlacklist', item)"
      @remove="(id) => store.removeListItem('commandBlacklist', id)"
      @toggle="(id, e) => store.toggleListItem('commandBlacklist', id, e)"
    />
    <ListSection
      title="目录白名单"
      value-label="目录路径"
      :items="bwl.dirWhitelist"
      :show-risk="false"
      @save="(item) => store.saveListItem('dirWhitelist', item)"
      @remove="(id) => store.removeListItem('dirWhitelist', id)"
      @toggle="(id, e) => store.toggleListItem('dirWhitelist', id, e)"
    />
    <ListSection
      title="API / 数据库黑名单"
      value-label="路径 / 表字段"
      :items="bwl.apiDbBlacklist"
      :show-risk="true"
      @save="(item) => store.saveListItem('apiDbBlacklist', item)"
      @remove="(id) => store.removeListItem('apiDbBlacklist', id)"
      @toggle="(id, e) => store.toggleListItem('apiDbBlacklist', id, e)"
    />
  </div>
</template>

<script setup lang="ts">
  import { useAgentSecurityStore } from '@/store/modules/agentSecurity'
  import ListSection from './ListSection.vue'

  defineOptions({ name: 'BlackWhiteListPanel' })

  const store = useAgentSecurityStore()
  /** 黑白名单四区引用 */
  const bwl = store.blackWhiteList
</script>

<style lang="scss" scoped>
  .bwl-panel {
    padding-right: 4px;
  }

  .bwl-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;

    .bwl-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--art-text-gray-900);
    }

    .bwl-desc {
      font-size: 12px;
      color: var(--art-text-gray-500);
    }
  }
</style>
