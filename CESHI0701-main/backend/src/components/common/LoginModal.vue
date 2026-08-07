<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('update:modelValue', false)"></div>

        <!-- Modal -->
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <!-- Close -->
          <button
            class="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all z-10"
            @click="$emit('update:modelValue', false)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div class="p-8">
            <!-- Header -->
            <div class="text-center mb-7">
              <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base mx-auto mb-4">A</div>
              <h2 class="text-xl font-bold text-gray-900">欢迎回来</h2>
              <p class="text-gray-400 text-sm mt-1">登录你的 AxureMart 账号</p>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleLogin" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1.5">账号</label>
                <input
                  v-model="form.username"
                  type="text"
                  placeholder="请输入账号"
                  autocomplete="username"
                  class="w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                  :class="errors.username ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
                  @input="errors.username = ''"
                />
                <p v-if="errors.username" class="text-xs text-red-400 mt-1">{{ errors.username }}</p>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-medium text-gray-700">密码</label>
                  <button type="button" class="text-xs text-blue-600 hover:text-blue-700">忘记密码？</button>
                </div>
                <div class="relative">
                  <input
                    v-model="form.password"
                    :type="showPwd ? 'text' : 'password'"
                    placeholder="请输入密码"
                    autocomplete="current-password"
                    class="w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                    :class="errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
                    @input="errors.password = ''"
                  />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="showPwd = !showPwd">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path v-if="!showPwd" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                    </svg>
                  </button>
                </div>
                <p v-if="errors.password" class="text-xs text-red-400 mt-1">{{ errors.password }}</p>
              </div>

              <!-- Error message -->
              <div v-if="loginError" class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
                <svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                </svg>
                <span class="text-xs text-red-600">{{ loginError }}</span>
              </div>

              <button
                type="submit"
                :disabled="loading"
                class="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ loading ? '登录中...' : '登录' }}
              </button>
            </form>

            <!-- Demo hint -->
            <div class="mt-5 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p class="text-xs text-gray-400 text-center">
                演示账号：<span class="text-gray-600 font-medium">admin</span> / <span class="text-gray-600 font-medium">123456</span>
              </p>
            </div>

            <p class="text-center text-xs text-gray-400 mt-4">
              还没有账号？
              <button type="button" class="text-blue-600 hover:text-blue-700 font-medium">免费注册</button>
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()

const authStore = useAuthStore()
const loading = ref(false)
const loginError = ref('')
const showPwd = ref(false)

const form = reactive({ username: '', password: '' })
const errors = reactive({ username: '', password: '' })

async function handleLogin() {
  errors.username = form.username.trim() ? '' : '请输入账号'
  errors.password = form.password ? '' : '请输入密码'
  if (errors.username || errors.password) return

  loading.value = true
  loginError.value = ''
  const result = await authStore.login(form.username, form.password)
  loading.value = false

  if (result.success) {
    emit('update:modelValue', false)
    form.username = ''
    form.password = ''
  } else {
    loginError.value = result.message || '登录失败'
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative {
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
