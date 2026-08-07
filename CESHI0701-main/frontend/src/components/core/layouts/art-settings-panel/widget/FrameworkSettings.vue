<template>
  <div>
    <SectionTitle title="系统框架" />
    <div class="setting-box-wrap">
      <div
        class="setting-item"
        v-for="(item, index) in frameworkOptions"
        :key="item.value"
        @click="handleFrameworkChange(item.value)"
      >
        <div class="box" :class="{ 'is-active': item.value === currentFramework }">
          <img :src="item.img" />
        </div>
        <p class="name">{{ item.name }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { storeToRefs } from 'pinia'
  import SectionTitle from './SectionTitle.vue'
  import { useSettingStore } from '@/store/modules/setting'
  import { FrameworkTypeEnum } from '@/enums/appEnum'
  import { configImages } from '@/config/assets/images'

  const settingStore = useSettingStore()
  const { frameworkType } = storeToRefs(settingStore)

  // 当前框架类型
  const currentFramework = computed(() => frameworkType.value)

  // 框架选项配置
  const frameworkOptions = [
    {
      name: '框架一',
      value: FrameworkTypeEnum.FRAMEWORK_ONE,
      img: configImages.menuLayouts.vertical
    },
    {
      name: '框架二',
      value: FrameworkTypeEnum.FRAMEWORK_TWO,
      img: configImages.menuLayouts.horizontal
    }
  ]

  // 切换框架
  const handleFrameworkChange = (type: FrameworkTypeEnum) => {
    settingStore.switchFramework(type)
  }
</script>
