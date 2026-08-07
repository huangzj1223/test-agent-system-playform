<template>
  <ElSubMenu v-if="hasChildren" :index="item.path || item.meta.title">
    <template #title>
      <el-icon class="menu-icon" :style="{ color: theme?.iconColor }">
        <component :is="getIconComponent(item.meta.icon)" />
      </el-icon>
      <span>{{ formatMenuTitle(item.meta.title) }}</span>
      <div v-if="item.meta.showBadge" class="art-badge art-badge-horizontal" />
      <div v-if="item.meta.showTextBadge" class="art-text-badge">
        {{ item.meta.showTextBadge }}
      </div>
    </template>

    <!-- 递归调用自身处理子菜单 -->
    <HorizontalSubmenu
      v-for="child in filteredChildren"
      :key="child.path"
      :item="child"
      :theme="theme"
      :is-mobile="isMobile"
      :level="level + 1"
      @close="closeMenu"
    />
  </ElSubMenu>

  <ElMenuItem
    v-else-if="!item.meta.isHide"
    :index="item.path || item.meta.title"
    @click="goPage(item)"
  >
    <el-icon class="menu-icon" :style="{ color: theme?.iconColor }">
      <component :is="getIconComponent(item.meta.icon)" />
    </el-icon>
    <span>{{ formatMenuTitle(item.meta.title) }}</span>
    <div
      v-if="item.meta.showBadge"
      class="art-badge"
      :style="{ right: level === 0 ? '10px' : '20px' }"
    />
    <div v-if="item.meta.showTextBadge && level !== 0" class="art-text-badge">
      {{ item.meta.showTextBadge }}
    </div>
  </ElMenuItem>
</template>

<script lang="ts" setup>
  import { computed, type PropType } from 'vue'
  import * as Icons from '@element-plus/icons-vue'
  import { AppRouteRecord } from '@/types/router'
  import { handleMenuJump } from '@/utils/navigation'
  import { formatMenuTitle } from '@/router/utils/utils'

  const props = defineProps({
    item: {
      type: Object as PropType<AppRouteRecord>,
      required: true
    },
    theme: {
      type: Object,
      default: () => ({})
    },
    isMobile: Boolean,
    level: {
      type: Number,
      default: 0
    }
  })

  const emit = defineEmits(['close'])

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null
    return Icons[iconName as keyof typeof Icons] ?? null
  }

  const filteredChildren = computed(() => {
    return props.item.children?.filter((child) => !child.meta.isHide) || []
  })

  const hasChildren = computed(() => {
    return filteredChildren.value.length > 0
  })

  const goPage = (item: AppRouteRecord) => {
    closeMenu()
    handleMenuJump(item)
  }

  const closeMenu = () => {
    emit('close')
  }
</script>

<style lang="scss" scoped>
  .el-sub-menu {
    padding: 0 !important;

    :deep(.el-sub-menu__title) {
      .el-sub-menu__icon-arrow {
        right: 10px !important;
      }
    }
  }

  .menu-icon {
    margin-right: 5px;
    font-size: 16px;
  }
</style>
