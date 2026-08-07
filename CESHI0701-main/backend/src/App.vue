<template>
  <el-scrollbar ref="scrollbarRef" height="100vh" @scroll="onScroll">
    <RouterView />
  </el-scrollbar>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'

const scrollY = ref(0)
provide('scrollY', scrollY)

function onScroll({ scrollTop }: { scrollTop: number }) {
  scrollY.value = scrollTop
}
</script>
