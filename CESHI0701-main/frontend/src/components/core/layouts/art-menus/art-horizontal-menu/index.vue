<!-- 水平菜单 -->
<template>
  <div class="top-menu">
    <!-- 左侧滚动按钮 -->
    <div v-show="showLeftArrow" class="scroll-btn left" @click="scroll('left')">
      <ElIcon>
        <ArrowLeft />
      </ElIcon>
    </div>

    <!-- 滚动容器 -->
    <ElScrollbar
      ref="scrollbarRef"
      wrap-class="scrollbar-wrapper"
      :horizontal="true"
      @scroll="handleScroll"
      @wheel="handleWheel"
    >
      <ElMenu
        :ellipsis="false"
        mode="horizontal"
        :default-active="routerPath"
        text-color="var(--art-text-gray-700)"
        :popper-offset="-6"
        background-color="transparent"
        :show-timeout="50"
        :hide-timeout="50"
        popper-class="horizontal-menu-popper"
      >
        <HorizontalSubmenu
          v-for="item in filteredMenuItems"
          :key="item.path"
          :item="item"
          :isMobile="false"
          :level="0"
        />
      </ElMenu>
    </ElScrollbar>

    <!-- 右侧滚动按钮 -->
    <div v-show="showRightArrow" class="scroll-btn right" @click="scroll('right')">
      <ElIcon>
        <ArrowRight />
      </ElIcon>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, nextTick } from 'vue'
  import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
  import { useThrottleFn } from '@vueuse/core'
  import type { AppRouteRecord } from '@/types/router'
  import HorizontalSubmenu from './widget/HorizontalSubmenu.vue'

  defineOptions({ name: 'ArtHorizontalMenu' })

  interface Props {
    /** 菜单列表数据 */
    list: AppRouteRecord[]
  }

  type ScrollDirection = 'left' | 'right'

  const route = useRoute()

  const props = withDefaults(defineProps<Props>(), {
    list: () => []
  })

  const scrollbarRef = ref<any>()
  const showLeftArrow = ref(false)
  const showRightArrow = ref(false)

  /** 滚动配置 */
  const SCROLL_CONFIG = {
    /** 点击按钮时的滚动距离 */
    BUTTON_SCROLL_DISTANCE: 200,
    /** 鼠标滚轮快速滚动时的步长 */
    WHEEL_FAST_STEP: 35,
    /** 鼠标滚轮慢速滚动时的步长 */
    WHEEL_SLOW_STEP: 30,
    /** 区分快慢滚动的阈值 */
    WHEEL_FAST_THRESHOLD: 100
  }

  /**
   * 过滤后的菜单项列表
   * 只显示未隐藏的菜单项
   */
  const filteredMenuItems = computed(() => {
    return filterMenuItems(props.list)
  })

  /**
   * 当前激活的路由路径
   * 用于菜单高亮显示
   */
  const routerPath = computed(() => String(route.meta.activePath || route.path))

  /**
   * 递归过滤菜单项，移除隐藏的菜单
   * 如果一个父菜单的所有子菜单都被隐藏，则父菜单也会被隐藏
   * @param items 菜单项数组
   * @returns 过滤后的菜单项数组
   */
  const filterMenuItems = (items: AppRouteRecord[]): AppRouteRecord[] => {
    return items
      .filter((item) => {
        // 如果当前项被隐藏，直接过滤掉
        if (item.meta.isHide) {
          return false
        }

        // 如果有子菜单，递归过滤子菜单
        if (item.children && item.children.length > 0) {
          const filteredChildren = filterMenuItems(item.children)
          // 如果所有子菜单都被过滤掉了，则隐藏父菜单
          return filteredChildren.length > 0
        }

        // 叶子节点且未被隐藏，保留
        return true
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterMenuItems(item.children) : undefined
      }))
  }

  /**
   * 处理滚动事件的核心逻辑
   * 根据滚动位置显示/隐藏滚动按钮
   */
  const handleScrollCore = (): void => {
    if (!scrollbarRef.value?.wrapRef) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollbarRef.value.wrapRef

    // 判断是否显示左侧滚动按钮
    showLeftArrow.value = scrollLeft > 0

    // 判断是否显示右侧滚动按钮
    showRightArrow.value = scrollLeft + clientWidth < scrollWidth
  }

  /**
   * 节流后的滚动事件处理函数
   * 调整节流间隔为16ms，约等于60fps
   */
  const handleScroll = useThrottleFn(handleScrollCore, 16)

  /**
   * 滚动菜单容器
   * @param direction 滚动方向，left 或 right
   */
  const scroll = (direction: ScrollDirection): void => {
    if (!scrollbarRef.value?.wrapRef) return

    const currentScroll = scrollbarRef.value.wrapRef.scrollLeft
    const targetScroll =
      direction === 'left'
        ? currentScroll - SCROLL_CONFIG.BUTTON_SCROLL_DISTANCE
        : currentScroll + SCROLL_CONFIG.BUTTON_SCROLL_DISTANCE

    // 平滑滚动到目标位置
    scrollbarRef.value.wrapRef.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }

  /**
   * 处理鼠标滚轮事件
   * 优化滚轮响应性能
   * @param event 滚轮事件
   */
  const handleWheel = (event: WheelEvent): void => {
    // 立即阻止默认滚动行为和事件冒泡，避免页面滚动
    event.preventDefault()
    event.stopPropagation()

    // 直接处理滚动，提升响应性
    if (!scrollbarRef.value?.wrapRef) return

    const { wrapRef } = scrollbarRef.value
    const { scrollLeft, scrollWidth, clientWidth } = wrapRef

    // 使用更小的滚动步长，让滚动更平滑
    const scrollStep =
      Math.abs(event.deltaY) > SCROLL_CONFIG.WHEEL_FAST_THRESHOLD
        ? SCROLL_CONFIG.WHEEL_FAST_STEP
        : SCROLL_CONFIG.WHEEL_SLOW_STEP
    const scrollDelta = event.deltaY > 0 ? scrollStep : -scrollStep
    const targetScroll = Math.max(0, Math.min(scrollLeft + scrollDelta, scrollWidth - clientWidth))

    // 立即滚动，无动画
    wrapRef.scrollLeft = targetScroll

    // 更新滚动按钮状态
    handleScrollCore()
  }

  /**
   * 初始化滚动状态
   */
  const initScrollState = (): void => {
    nextTick(() => {
      handleScrollCore()
    })
  }

  onMounted(initScrollState)
</script>

<style lang="scss" scoped>
  .top-menu {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    overflow: hidden;
    flex: 1;

    :deep(.el-scrollbar__bar.is-horizontal) {
      bottom: 5px;
      display: none;
      height: 2px;
    }

    :deep(.scrollbar-wrapper) {
      flex: 1;
      min-width: 0;
      margin: 0 50px 0 40px;
    }

    .el-menu {
      width: auto;
      min-width: 100%;
      border: none;
      white-space: nowrap;
      height: 60px;
      display: flex;
      align-items: center;
    }

    // 菜单项样式 - 参考混合菜单的 .item 样式
    :deep(.el-menu-item) {
      height: 40px !important;
      line-height: 40px !important;
      padding: 0 12px !important;
      margin: 0 !important;
      border-radius: 6px !important;
      border: none !important;
      color: var(--art-text-gray-700) !important;
      font-size: 14px !important;

      // hover 状态
      &:hover {
        color: var(--main-color) !important;
        background-color: transparent !important;
      }
    }

    // 子菜单标题 - 右侧需要更多空间给下拉箭头
    :deep(.el-sub-menu__title) {
      height: 40px !important;
      line-height: 40px !important;
      padding: 0 30px 0 12px !important;
      margin: 0 !important;
      border-radius: 6px !important;
      border: none !important;
      color: var(--art-text-gray-700) !important;
      font-size: 14px !important;

      // hover 状态
      &:hover {
        color: var(--main-color) !important;
        background-color: transparent !important;
      }
    }

    // 选中状态
    :deep(.el-menu-item.is-active),
    :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
      color: var(--main-color) !important;
      background-color: var(--main-bg-color) !important;
      border: none !important;
    }

    // 菜单项前面的图标样式（左侧图标）
    :deep(.el-menu-item .el-icon:first-child),
    :deep(.el-sub-menu__title .el-icon:first-child) {
      margin-right: 5px;
      font-size: 15px;
    }

    // 子菜单箭头图标样式（右侧箭头）
    :deep(.el-sub-menu__title .el-icon:last-child) {
      margin-left: 8px !important;
      margin-right: 0 !important;
      font-size: 15px;
    }

    .scroll-btn {
      position: absolute;
      top: 50%;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      color: var(--art-text-gray-600);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      transform: translateY(-50%);

      &:hover {
        color: var(--art-text-gray-900);
        background-color: rgba(var(--art-gray-200-rgb), 0.8);
      }

      &.left {
        left: 3px;
      }

      &.right {
        right: 10px;
      }
    }
  }
</style>
