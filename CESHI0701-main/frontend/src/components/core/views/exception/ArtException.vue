<template>
  <div class="page-content state-page">
    <div class="tips">
      <ThemeSvg :src="data.imgUrl" size="100%" />
      <div class="right-wrap">
        <p>{{ data.desc }}</p>
        <div class="btn-group">
          <ElButton type="primary" size="large" @click="backHome" v-ripple>{{
            data.btnText
          }}</ElButton>
          <ElButton v-if="data.showLogout" size="large" @click="handleLogout" v-ripple>
            退出登录
          </ElButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useCommon } from '@/composables/useCommon'
  import { useUserStore } from '@/store/modules/user'

  const router = useRouter()
  const userStore = useUserStore()

  interface ExceptionData {
    /** 标题 */
    title: string
    /** 描述 */
    desc: string
    /** 按钮文本 */
    btnText: string
    /** 图片地址 */
    imgUrl: string
    /** 是否显示「退出登录」次按钮（无权限场景用，避免返回首页死循环） */
    showLogout?: boolean
  }

  withDefaults(
    defineProps<{
      data: ExceptionData
    }>(),
    {}
  )

  const backHome = () => {
    router.push(useCommon().homePath.value)
  }

  // 退出登录：无可访问菜单时返回首页会再次触发 403，提供直接登出的逃生出口
  const handleLogout = () => {
    userStore.logOut()
  }
</script>

<style lang="scss" scoped>
  .state-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: transparent !important;
    border: 0 !important;

    .tips {
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 300px;
      }

      .right-wrap {
        width: 300px;
        margin-left: 60px;

        p {
          font-size: 20px;
          line-height: 28px;
          color: var(--art-gray-600);
        }

        .el-button {
          margin-top: 20px;
        }

        .btn-group {
          display: flex;
          gap: 12px;
          margin-top: 20px;

          .el-button {
            margin-top: 0;
          }
        }
      }
    }
  }

  @media only screen and (max-width: $device-ipad-vertical) {
    .state-page {
      .tips {
        display: block;
        text-align: center;

        img {
          width: 200px;
        }

        .right-wrap {
          width: 100%;
          margin: auto;
          text-align: center;

          p {
            margin-top: 40px;
            font-size: 18px;
          }
        }
      }
    }
  }
</style>
