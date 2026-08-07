import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const menuOpen = ref(false)

  function toggleMenu() {
    menuOpen.value = !menuOpen.value
  }

  return { menuOpen, toggleMenu }
})
