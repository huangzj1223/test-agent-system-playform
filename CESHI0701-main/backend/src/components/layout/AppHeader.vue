<template>
  <header
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    :class="scrolled ? 'bg-white/60 backdrop-blur-2xl' : 'bg-transparent'"
  >
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo + Nav -->
        <div class="flex items-center">
          <RouterLink to="/" class="flex items-center gap-2 no-underline shrink-0 mr-8">
            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">A</div>
            <span class="font-bold text-base text-gray-900">AxureMart</span>
          </RouterLink>

          <!-- Desktop Nav -->
          <nav class="hidden md:flex items-center">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="relative px-3.5 py-5 text-sm text-gray-500 hover:text-gray-900 transition-colors no-underline whitespace-nowrap"
            active-class="text-blue-600 font-medium nav-active"
            exact-active-class="text-blue-600 font-medium nav-active"
          >
            {{ item.label }}
          </RouterLink>
          </nav>
        </div>

        <!-- CTA -->
        <div class="hidden md:flex items-center gap-2 shrink-0">
          <!-- Logged in: user avatar + dropdown -->
          <template v-if="authStore.isLoggedIn">
            <div class="relative" ref="userMenuRef">
              <button
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                @click="userMenuOpen = !userMenuOpen"
              >
                <div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {{ authStore.user?.name?.[0] }}
                </div>
                <span class="text-sm text-gray-700 font-medium">{{ authStore.user?.name }}</span>
                <svg class="w-3.5 h-3.5 text-gray-400 transition-transform" :class="userMenuOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <!-- Dropdown -->
              <div v-if="userMenuOpen" class="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
                <div class="px-3 py-2 border-b border-gray-50">
                  <div class="text-xs font-medium text-gray-900 truncate">{{ authStore.user?.name }}</div>
                  <div class="text-xs text-gray-400 truncate">{{ authStore.user?.email }}</div>
                </div>
                <button class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                  个人中心
                </button>
                <button class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  账号设置
                </button>
                <div class="border-t border-gray-50 mt-1 pt-1">
                  <button class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left" @click="handleLogout">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- Not logged in -->
          <template v-else>
            <button class="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors" @click="loginModalOpen = true">登录</button>
            <button class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              免费试用
            </button>
          </template>
        </div>

        <!-- Mobile menu button -->
        <button class="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-all" @click="menuOpen = !menuOpen">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Nav -->
    <div v-if="menuOpen" class="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-1">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all no-underline"
        exact-active-class="text-blue-600 font-medium bg-blue-50"
        active-class="text-blue-600 font-medium bg-blue-50"
        @click="menuOpen = false"
      >
        {{ item.label }}
      </RouterLink>
      <div class="border-t border-gray-100 mt-2 pt-3 flex flex-col gap-2">
        <button v-if="!authStore.isLoggedIn" class="w-full py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium" @click="loginModalOpen = true; menuOpen = false">登录</button>
        <button v-if="!authStore.isLoggedIn" class="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">免费试用</button>
        <button v-if="authStore.isLoggedIn" class="w-full py-2.5 rounded-lg border border-red-100 text-red-500 text-sm font-medium" @click="handleLogout">退出登录</button>
      </div>
    </div>
  </header>

  <LoginModal v-model="loginModalOpen" />
</template>

<script setup lang="ts">
import { ref, inject, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import LoginModal from '@/components/common/LoginModal.vue'

const authStore = useAuthStore()
const menuOpen = ref(false)
const scrolled = ref(false)
const loginModalOpen = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement>()

// 从 App.vue 注入的滚动位置
const scrollY = inject<Ref<number>>('scrollY')
if (scrollY) {
  watch(scrollY, (val) => { scrolled.value = val > 20 })
}

function onClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  userMenuOpen.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))

const navItems = [
  { label: '首页', path: '/' },
  { label: '产品', path: '/product' },
  { label: '定价', path: '/pricing' },
  { label: '关于我们', path: '/about' },
  { label: '联系我们', path: '/contact' },
]
</script>

<style scoped>
.nav-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 14px;
  right: 14px;
  height: 2px;
  background-color: #2563eb;
  border-radius: 1px;
}
</style>
