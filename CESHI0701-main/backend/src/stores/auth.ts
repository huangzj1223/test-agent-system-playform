import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: number
  name: string
  email: string
  avatar: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<User | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  )

  const isLoggedIn = computed(() => !!token.value)

  async function login(username: string, password: string) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.code === 0) {
        token.value = data.data.token
        user.value = data.data.user
        localStorage.setItem('token', token.value)
        localStorage.setItem('user', JSON.stringify(user.value))
        return { success: true }
      }
      return { success: false, message: data.message as string }
    } catch {
      return { success: false, message: '网络异常，请稍后重试' }
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isLoggedIn, login, logout }
})
