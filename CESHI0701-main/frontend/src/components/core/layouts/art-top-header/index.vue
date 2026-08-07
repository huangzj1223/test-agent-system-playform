<!-- 框架二顶部Header组件 -->
<template>
  <div class="art-top-header">
    <div class="header-container">
      <!-- 左侧：系统Logo和标题 -->
      <div class="header-left">
        <div class="top-header" @click="toHome">
          <ArtLogo class="logo" />
          <p>{{ AppConfig.systemInfo.name }}</p>
        </div>

        <!-- 水平菜单（框架二） -->
        <ArtHorizontalMenu
          v-if="isTopMenu"
          :list="menuList"
          class="framework-two-horizontal-menu"
        />

        <!-- 混合菜单（框架二） -->
        <ArtMixedMenu v-if="isTopLeftMenu" :list="menuList" class="framework-two-mixed-menu" />
      </div>

      <!-- 右侧：工具栏 (从 ArtHeaderBar 复制) -->
      <div class="header-right">
        <!-- 搜索 -->
        <div class="search-wrap" v-if="shouldShowGlobalSearch">
          <div class="search-input" @click="openSearchDialog">
            <div class="left">
              <i class="iconfont-sys">&#xe710;</i>
              <span>{{ $t('topBar.search.title') }}</span>
            </div>
            <div class="search-keydown">
              <i class="iconfont-sys" v-if="isWindows">&#xeeac;</i>
              <i class="iconfont-sys" v-else>&#xe9ab;</i>
              <span>k</span>
            </div>
          </div>
        </div>

        <!-- 全屏按钮 -->
        <div class="btn-box screen-box" v-if="shouldShowFullscreen" @click="toggleFullScreen">
          <div
            class="btn"
            :class="{ 'full-screen-btn': !isFullscreen, 'exit-full-screen-btn': isFullscreen }"
          >
            <i class="iconfont-sys">{{ isFullscreen ? '&#xe62d;' : '&#xe8ce;' }}</i>
          </div>
        </div>

        <!-- 语言 -->
        <div class="btn-box" v-if="shouldShowLanguage">
          <ElDropdown @command="changeLanguage" popper-class="langDropDownStyle">
            <div class="btn language-btn">
              <i class="iconfont-sys">&#xe611;</i>
            </div>
            <template #dropdown>
              <ElDropdownMenu>
                <div v-for="item in languageOptions" :key="item.value" class="lang-btn-item">
                  <ElDropdownItem
                    :command="item.value"
                    :class="{ 'is-selected': locale === item.value }"
                  >
                    <span class="menu-txt">{{ item.label }}</span>
                    <i v-if="locale === item.value" class="iconfont-sys">&#xe621;</i>
                  </ElDropdownItem>
                </div>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>

        <!-- 设置 -->
        <div class="btn-box" v-if="shouldShowSettings" @click="openSetting">
          <ElPopover :visible="showSettingGuide" placement="bottom-start" :width="190" :offset="0">
            <template #reference>
              <div class="btn setting-btn">
                <i class="iconfont-sys">&#xe6d0;</i>
              </div>
            </template>
            <template #default>
              <p
                >{{ $t('topBar.guide.title')
                }}<span :style="{ color: systemThemeColor }"> {{ $t('topBar.guide.theme') }} </span
                >、 <span :style="{ color: systemThemeColor }"> {{ $t('topBar.guide.menu') }} </span
                >{{ $t('topBar.guide.description') }}</p
              >
            </template>
          </ElPopover>
        </div>

        <!-- 切换主题 -->
        <div class="btn-box" v-if="shouldShowThemeToggle" @click="themeAnimation">
          <div class="btn theme-btn">
            <i class="iconfont-sys">{{ isDark ? '&#xe6b5;' : '&#xe725;' }}</i>
          </div>
        </div>

        <!-- 用户头像、菜单 -->
        <div class="user">
          <ElPopover
            ref="userMenuPopover"
            placement="bottom-end"
            :width="240"
            :hide-after="0"
            :offset="10"
            trigger="hover"
            :show-arrow="false"
            popper-class="user-menu-popover"
          >
            <template #reference>
              <img class="cover" src="@imgs/user/avatar.webp" alt="avatar" />
            </template>
            <template #default>
              <div class="user-menu-box">
                <div class="user-head">
                  <img class="cover" src="@imgs/user/avatar.webp" style="float: left" />
                  <div class="user-wrap">
                    <span class="name">{{ userInfo.username }}</span>
                    <span class="email">{{ userInfo.email }}</span>
                  </div>
                </div>
                <ul class="user-menu">
                  <li @click="lockScreen()">
                    <i class="menu-icon iconfont-sys">&#xe817;</i>
                    <span class="menu-txt">{{ $t('topBar.user.lockScreen') }}</span>
                  </li>
                  <div class="line"></div>
                  <div class="logout-btn" @click="loginOut">{{ $t('topBar.user.logout') }}</div>
                </ul>
              </div>
            </template>
          </ElPopover>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { ElMessageBox } from 'element-plus'
  import { useFullscreen } from '@vueuse/core'
  import { LanguageEnum, MenuTypeEnum } from '@/enums/appEnum'
  import { useSettingStore } from '@/store/modules/setting'
  import { useUserStore } from '@/store/modules/user'
  import { useMenuStore } from '@/store/modules/menu'
  import AppConfig from '@/config'
  import { languageOptions } from '@/locales'
  import { WEB_LINKS } from '@/utils/constants'
  import { mittBus } from '@/utils/sys'
  import { themeAnimation } from '@/utils/theme/animation'
  import { useHeaderBar } from '@/composables/useHeaderBar'

  // 检测操作系统
  const isWindows = navigator.userAgent.includes('Windows')

  // 初始化
  const router = useRouter()
  const { locale, t } = useI18n()
  const settingStore = useSettingStore()
  const userStore = useUserStore()
  const menuStore = useMenuStore()

  // 功能配置
  const {
    shouldShowGlobalSearch,
    shouldShowFullscreen,
    shouldShowNotification,
    shouldShowChat,
    shouldShowLanguage,
    shouldShowSettings,
    shouldShowThemeToggle
  } = useHeaderBar()

  // Store 状态
  const { systemThemeColor, showSettingGuide, isDark, menuType } = storeToRefs(settingStore)
  const { language, getUserInfo: userInfo } = storeToRefs(userStore)
  const { menuList } = storeToRefs(menuStore)

  // 菜单类型判断
  const isTopMenu = computed(() => menuType.value === MenuTypeEnum.TOP)
  const isTopLeftMenu = computed(() => menuType.value === MenuTypeEnum.TOP_LEFT)

  // 本地状态
  const showNotice = ref(false)
  const userMenuPopover = ref()

  // 全屏相关
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
  const toggleFullScreen = (): void => {
    toggleFullscreen()
  }

  // 通知相关
  const visibleNotice = (): void => {
    showNotice.value = !showNotice.value
  }

  // 聊天相关
  const openChat = (): void => {
    mittBus.emit('openChat')
  }

  // 语言切换
  const changeLanguage = (lang: LanguageEnum): void => {
    if (locale.value === lang) return
    locale.value = lang
    userStore.setLanguage(lang)
    // 刷新页面
    setTimeout(() => {
      window.location.reload()
    }, 50)
  }

  // 设置面板
  const openSetting = (): void => {
    mittBus.emit('openSetting')
    if (showSettingGuide.value) {
      settingStore.hideSettingGuide()
    }
  }

  // 搜索对话框
  const openSearchDialog = (): void => {
    mittBus.emit('openSearchDialog')
  }

  // 锁屏
  const lockScreen = (): void => {
    mittBus.emit('openLockScreen')
  }

  // 关闭用户菜单
  const closeUserMenu = (): void => {
    if (userMenuPopover.value) {
      userMenuPopover.value.hide()
    }
  }

  // 登出
  const loginOut = (): void => {
    closeUserMenu()
    setTimeout(() => {
      ElMessageBox.confirm(t('common.logOutTips'), t('common.tips'), {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        customClass: 'login-out-dialog'
      }).then(() => {
        userStore.logOut()
      })
    }, 200)
  }

  // 文档和GitHub
  const toDocs = (): void => {
    window.open(WEB_LINKS.DOCS)
  }

  const toGithub = (): void => {
    window.open(WEB_LINKS.GITHUB)
  }

  // 跳转首页
  const toHome = (): void => {
    router.push('/')
  }
</script>

<style scoped lang="scss">
  .art-top-header {
    width: 100%;
    height: 60px;
    background-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .header-container {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
    }

    .header-left {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      overflow: hidden;

      .top-header {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: opacity 0.3s;
        flex-shrink: 0;

        &:hover {
          opacity: 0.8;
        }

        .logo {
          width: 32px;
          height: 32px;
        }

        p {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          margin: 0;
        }
      }

      .framework-two-horizontal-menu {
        flex: 1;
        margin-left: 20px;
        overflow: hidden;
        max-width: calc(100% - 200px); // 限制最大宽度，为右侧工具栏留出空间

        // 通过 CSS 变量覆盖水平菜单的颜色
        --el-menu-text-color: rgba(255, 255, 255, 0.85);
        --el-menu-hover-text-color: #ffffff;
        --el-menu-active-color: #ffffff;
        --el-menu-hover-bg-color: rgba(255, 255, 255, 0.1);

        :deep(.el-menu) {
          background-color: transparent !important;
          border: none !important;
        }

        :deep(.el-menu-item) {
          color: rgba(255, 255, 255, 0.85) !important;
          border-bottom: 2px solid transparent !important;

          &:hover {
            color: #ffffff !important;
            background-color: transparent !important;
          }

          &.is-active {
            color: #ffffff !important;
            border-bottom-color: transparent !important;
            background-color: rgba(255, 255, 255, 0.15) !important;
          }
        }

        :deep(.el-sub-menu__title) {
          color: rgba(255, 255, 255, 0.85) !important;
          border-bottom: 2px solid transparent !important;
          padding: 0 30px 0 10px !important;
          border: 0 !important;

          &:hover {
            color: #ffffff !important;
            background-color: transparent !important;
          }
        }

        :deep(.el-sub-menu.is-active .el-sub-menu__title) {
          color: #ffffff !important;
          border-bottom-color: transparent !important;
          background-color: rgba(255, 255, 255, 0.15) !important;
        }

        :deep(.el-icon) {
          color: rgba(255, 255, 255, 0.85) !important;
        }
      }

      .framework-two-mixed-menu {
        flex: 1;
        margin-left: 20px;
        overflow: hidden;

        // 通过 CSS 变量覆盖混合菜单的颜色
        --main-color: #ffffff;
        --main-bg-color: rgba(255, 255, 255, 0.15);
        --art-text-gray-600: rgba(255, 255, 255, 0.85);
        --art-text-gray-700: rgba(255, 255, 255, 0.85);
        --art-text-gray-900: #ffffff;
        --art-gray-200-rgb: 255, 255, 255;

        :deep(.mixed-top-menu) {
          .scroll-bar {
            .item {
              color: rgba(255, 255, 255, 0.85) !important;

              i {
                color: rgba(255, 255, 255, 0.85) !important;
              }

              &:hover {
                color: #ffffff !important;
                background-color: transparent !important;
              }

              &.active {
                color: #ffffff !important;
                background-color: rgba(255, 255, 255, 0.15) !important;

                &::after {
                  background-color: transparent !important;
                }
              }
            }
          }

          .scroll-btn {
            color: rgba(255, 255, 255, 0.85) !important;

            &:hover {
              color: #ffffff !important;
              background-color: rgba(255, 255, 255, 0.1) !important;
            }
          }
        }
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;

      .search-wrap {
        margin-right: 8px;

        .search-input {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 180px;
          height: 36px;
          padding: 0 12px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            background: rgba(255, 255, 255, 0.25);
          }

          .left {
            display: flex;
            align-items: center;
            gap: 8px;

            i {
              color: #ffffff;
              font-size: 16px;
            }

            span {
              color: #ffffff;
              font-size: 14px;
            }
          }

          .search-keydown {
            display: flex;
            align-items: center;
            gap: 4px;

            i,
            span {
              display: flex;
              align-items: center;
              justify-content: center;
              min-width: 20px;
              height: 20px;
              padding: 0 4px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 4px;
              color: #ffffff;
              font-size: 12px;
              font-style: normal;
            }
          }
        }
      }

      .btn-box {
        display: flex;
        align-items: center;
        justify-content: center;

        .btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            background: rgba(255, 255, 255, 0.15);
          }

          i {
            color: #ffffff;
            font-size: 18px;
          }
        }
      }

      .user {
        margin-left: 8px;
        cursor: pointer;

        .cover {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s;

          &:hover {
            border-color: rgba(255, 255, 255, 0.6);
          }
        }
      }
    }
  }

  .dark {
    .art-top-header {
      background-color: #1a1a1a;

      .framework-two-horizontal-menu {
        :deep(.el-menu-item) {
          color: rgba(255, 255, 255, 0.85) !important;

          &:hover {
            color: #ffffff !important;
            background-color: rgba(255, 255, 255, 0.1) !important;
          }

          &.is-active {
            color: #ffffff !important;
            border-bottom-color: #ffffff !important;
          }
        }

        :deep(.el-sub-menu__title) {
          color: rgba(255, 255, 255, 0.85) !important;

          &:hover {
            color: #ffffff !important;
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
        }

        :deep(.el-sub-menu.is-active .el-sub-menu__title) {
          color: #ffffff !important;
          border-bottom-color: #ffffff !important;
        }
      }

      .framework-two-mixed-menu {
        :deep(.mixed-top-menu) {
          .scroll-bar {
            .item {
              color: rgba(255, 255, 255, 0.85) !important;

              i {
                color: rgba(255, 255, 255, 0.85) !important;
              }

              &:hover {
                color: #ffffff !important;
                background-color: rgba(255, 255, 255, 0.1) !important;
              }

              &.active {
                color: #ffffff !important;
                background-color: rgba(255, 255, 255, 0.15) !important;

                &::after {
                  background-color: #ffffff !important;
                }
              }
            }
          }

          .scroll-btn {
            color: rgba(255, 255, 255, 0.85) !important;

            &:hover {
              color: #ffffff !important;
              background-color: rgba(255, 255, 255, 0.1) !important;
            }
          }
        }
      }
    }
  }
</style>

<style lang="scss">
  @use '@styles/variables.scss' as *;

  .user-menu-popover {
    padding: 0 !important;

    .user-menu-box {
      padding: 10px 16px 0;

      .user-head {
        display: flex;
        align-items: center;
        padding: 0 0 4px;

        .cover {
          width: 40px;
          height: 40px;
          margin: 0 10px 0 0;
          overflow: hidden;
          background: #eee;
          border-radius: 50%;
        }

        .user-wrap {
          width: calc(100% - 60px);
          height: 100%;

          span {
            display: block;
          }

          .name {
            font-size: 14px;
            font-weight: 500;
            color: var(--art-gray-800);

            @include ellipsis();
          }

          .email {
            margin-top: 3px;
            font-size: 12px;
            color: var(--art-gray-500);

            @include ellipsis();
          }
        }
      }

      .user-menu {
        padding: 16px 0;
        margin-top: 10px;
        border-top: 1px solid var(--art-border-color);

        li {
          display: flex;
          align-items: center;
          padding: 8px;
          margin-bottom: 10px;
          cursor: pointer;
          user-select: none;
          border-radius: 6px;

          &:last-of-type {
            margin-bottom: 0;
          }

          i {
            display: block;
            width: 25px;
            font-size: 16px;
            color: var(--art-text-gray-800);
          }

          span {
            font-size: 14px;
            color: var(--art-text-gray-800);
          }

          &:hover {
            background-color: rgb(var(--art-gray-200-rgb), 0.7);
          }
        }

        .line {
          width: 100%;
          height: 1px;
          margin: 10px 0;
          background-color: var(--art-border-color);
        }

        .logout-btn {
          box-sizing: border-box;
          width: 100%;
          padding: 7px 0;
          margin-top: 20px;
          font-size: 13px;
          color: var(--art-text-gray-800);
          text-align: center;
          cursor: pointer;
          border: 1px solid var(--art-border-dashed-color);
          border-radius: 7px;
          transition: all 0.2s;

          &:hover {
            box-shadow: 0 0 10px rgb(var(--art-gray-300-rgb), 0.7);
          }
        }
      }
    }
  }

  // 框架二混合菜单白色样式（非 scoped，使用最高优先级强制覆盖）
  .art-top-header .header-left .framework-two-mixed-menu {
    // 覆盖 CSS 变量
    --main-color: #ffffff;
    --main-bg-color: rgba(255, 255, 255, 0.15);
    --art-text-gray-600: rgba(255, 255, 255, 0.85);
    --art-text-gray-700: rgba(255, 255, 255, 0.85);
    --art-text-gray-900: #ffffff;
    --art-gray-200-rgb: 255, 255, 255;
  }

  // 强制覆盖所有混合菜单元素的颜色
  .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-bar .item {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-bar .item i {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-bar .item span {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-bar .item:hover {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-bar .item:hover i {
    color: #ffffff !important;
  }

  .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item:hover
    span {
    color: #ffffff !important;
  }

  .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-bar .item.active {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.15) !important;
  }

  .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item.active
    i {
    color: #ffffff !important;
  }

  .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item.active
    span {
    color: #ffffff !important;
  }

  .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item.active::after {
    background-color: transparent !important;
  }

  .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-btn {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-btn:hover {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  // 暗黑模式
  .dark .art-top-header .header-left .framework-two-mixed-menu {
    --main-color: #ffffff;
    --main-bg-color: rgba(255, 255, 255, 0.15);
    --art-text-gray-600: rgba(255, 255, 255, 0.85);
    --art-text-gray-700: rgba(255, 255, 255, 0.85);
    --art-text-gray-900: #ffffff;
    --art-gray-200-rgb: 255, 255, 255;
  }

  .dark .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-bar .item {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .dark .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-bar .item i {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .dark
    .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item
    span {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .dark
    .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item:hover {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.1) !important;
  }

  .dark
    .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item:hover
    i {
    color: #ffffff !important;
  }

  .dark
    .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item:hover
    span {
    color: #ffffff !important;
  }

  .dark
    .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item.active {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.15) !important;
  }

  .dark
    .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item.active
    i {
    color: #ffffff !important;
  }

  .dark
    .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item.active
    span {
    color: #ffffff !important;
  }

  .dark
    .art-top-header
    .header-left
    .framework-two-mixed-menu
    .mixed-top-menu
    .scroll-bar
    .item.active::after {
    background-color: transparent !important;
  }

  .dark .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-btn {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .dark .art-top-header .header-left .framework-two-mixed-menu .mixed-top-menu .scroll-btn:hover {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.1) !important;
  }
</style>
