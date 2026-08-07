<template>
  <!-- 框架一：传统布局（左侧菜单 + 顶部栏） -->
  <div v-if="!isFrameworkTwo" class="app-layout">
    <aside class="app-sidebar">
      <ArtSidebarMenu />
    </aside>

    <main id="app-main">
      <div class="app-header">
        <ArtHeaderBar />
      </div>
      <ArtWorkTab />
      <ElScrollbar class="app-scrollbar">
        <div class="app-content">
          <ArtPageContent />
        </div>
      </ElScrollbar>
    </main>

    <!-- 右侧智能体对话侧边栏（第三栏，flex 推挤，不遮挡业务内容） -->
    <ArtAgentChat />

    <div class="app-global">
      <ArtGlobalComponent />
    </div>

  </div>

  <!-- 框架二：顶部Header布局 -->
  <div
    v-else
    class="app-layout framework-two"
    :style="{ '--sidebar-width': sidebarWidth, '--agent-panel-space': agentPanelSpace }"
  >
    <div class="app-top-header">
      <ArtTopHeader />
    </div>

    <!-- 只在非水平菜单时显示侧边栏 -->
    <aside v-if="showSidebarInFrameworkTwo" class="app-sidebar">
      <ArtSidebarMenu />
    </aside>

    <main id="app-main" class="framework-two-main">
      <div class="app-header">
        <ArtHeaderBar />
      </div>
      <ElScrollbar class="app-scrollbar">
        <div class="app-content">
          <ArtPageContent />
        </div>
      </ElScrollbar>
    </main>

    <!-- 右侧智能体对话侧边栏（固定右侧，main 通过 margin-right 让位） -->
    <ArtAgentChat />

    <div class="app-global">
      <ArtGlobalComponent />
    </div>

  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useSettingStore } from '@/store/modules/setting'
  import { useMenuStore } from '@/store/modules/menu'
  import { useAgentChatStore } from '@/store/modules/agentChat'
  import { FrameworkTypeEnum, MenuWidth, MenuTypeEnum } from '@/enums/appEnum'

  defineOptions({ name: 'AppLayout' })

  const route = useRoute()
  const settingStore = useSettingStore()
  const menuStore = useMenuStore()
  const agentChatStore = useAgentChatStore()

  // 获取当前框架类型
  const frameworkType = computed(() => settingStore.frameworkType)

  // 判断是否为框架二
  const isFrameworkTwo = computed(() => frameworkType.value === FrameworkTypeEnum.FRAMEWORK_TWO)

  // 获取菜单状态和宽度
  const { menuOpen, getMenuOpenWidth, menuType } = storeToRefs(settingStore)

  // 判断是否为水平菜单
  const isTopMenu = computed(() => menuType.value === MenuTypeEnum.TOP)

  // 判断是否为混合菜单
  const isTopLeftMenu = computed(() => menuType.value === MenuTypeEnum.TOP_LEFT)

  // 判断是否为双列菜单
  const isDualMenu = computed(() => menuType.value === MenuTypeEnum.DUAL_MENU)

  // 判断混合菜单是否有子菜单
  const hasSubMenuInTopLeft = computed(() => {
    if (!isTopLeftMenu.value) return true

    // 获取当前顶级路径对应的菜单
    const currentTopPath = `/${route.path.split('/')[1]}`
    const currentMenu = menuStore.menuList.find((menu) => menu.path === currentTopPath)

    // 如果没有找到菜单，返回 false
    if (!currentMenu) return false

    // 判断是否有子菜单（排除隐藏的子菜单）
    const visibleChildren = currentMenu.children?.filter((child) => !child.meta.isHide) || []
    return visibleChildren.length > 0
  })

  // 判断双列菜单当前是否有子菜单（用于计算侧边栏宽度）
  const hasDualMenuChildren = computed(() => {
    if (!isDualMenu.value) return true
    const currentTopPath = `/${route.path.split('/')[1]}`
    const currentMenu = menuStore.menuList.find((menu) => menu.path === currentTopPath)
    return (currentMenu?.children?.length || 0) > 0
  })

  // 判断框架二是否显示侧边栏
  const showSidebarInFrameworkTwo = computed(() => {
    if (!isFrameworkTwo.value) return false

    // 水平菜单时不显示侧边栏
    if (isTopMenu.value) return false

    // 混合菜单时，只有当有子菜单时才显示侧边栏
    if (isTopLeftMenu.value) {
      return hasSubMenuInTopLeft.value
    }

    // 其他菜单类型显示侧边栏
    return true
  })

  // 计算侧边栏宽度
  const sidebarWidth = computed(() => {
    // 框架二且不显示侧边栏时，宽度为 0
    if (isFrameworkTwo.value && !showSidebarInFrameworkTwo.value) {
      return '0px'
    }
    const baseWidth = menuOpen.value ? getMenuOpenWidth.value : MenuWidth.CLOSE
    // 框架二双列菜单：有子菜单时加上 dual-menu-left 的 80px，无子菜单时只取 80px
    if (isFrameworkTwo.value && isDualMenu.value) {
      return hasDualMenuChildren.value ? `calc(${baseWidth} + 80px)` : '80px'
    }
    return baseWidth
  })

  // 框架二下右侧对话框占用的横向空间：仅「停靠态」展开且非移动端时为面板宽度，否则 0。
  // 悬浮态是脱离文档流的自由窗口、全屏态是覆盖层，二者都不应挤压主区，故只认 docked。
  const { isPanelOpen, panelWidth, isMobile: isAgentMobile, mode: agentMode } =
    storeToRefs(agentChatStore)
  const agentPanelSpace = computed(() =>
    agentMode.value === 'docked' && isPanelOpen.value && !isAgentMobile.value
      ? `${panelWidth.value}px`
      : '0px'
  )
</script>

<style lang="scss" scoped>
  @use './style';
</style>
