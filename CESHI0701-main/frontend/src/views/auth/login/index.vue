<template>
  <div class="login-page">
    <div class="login-card">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <div class="brand-logo">
          <el-icon :size="48" color="#ffffff">
            <Grid />
          </el-icon>
        </div>
        <h2 class="brand-name">{{ systemName }}</h2>
        <p class="brand-desc">安全监督风险智能分析平台</p>
        <div class="brand-circles">
          <div class="circle circle-1"></div>
          <div class="circle circle-2"></div>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-panel">
        <h3 class="form-title">{{ $t('login.title') }}</h3>
        <p class="form-subtitle">{{ $t('login.subTitle') }}</p>

        <ElForm
          ref="formRef"
          :model="formData"
          :rules="rules"
          :key="formKey"
          @keyup.enter="handleSubmit"
          class="login-form"
        >
          <ElFormItem prop="username">
            <ElInput
              :placeholder="$t('login.placeholder.username')"
              v-model.trim="formData.username"
              :prefix-icon="User"
            />
          </ElFormItem>
          <ElFormItem prop="password">
            <ElInput
              :placeholder="$t('login.placeholder.password')"
              v-model.trim="formData.password"
              type="password"
              autocomplete="off"
              show-password
              :prefix-icon="Lock"
            />
          </ElFormItem>

          <div class="form-options">
            <ElCheckbox v-model="formData.rememberPassword">{{
              $t('login.rememberPwd')
            }}</ElCheckbox>
          </div>

          <ElButton class="login-btn" type="primary" @click="handleSubmit" :loading="loading">
            {{ $t('login.btnText') }}
          </ElButton>

          <p class="default-account">默认账号：admin / 123456</p>
        </ElForm>
      </div>
    </div>

    <p class="copyright">© 2026 智能ai平台 All Rights Reserved</p>
  </div>
</template>

<script setup lang="ts">
  import AppConfig from '@/config'
  import { useUserStore } from '@/store/modules/user'
  import { useI18n } from 'vue-i18n'
  import { fetchLogin, fetchGetUserInfo } from '@/api/auth'
  import { ElNotification, type FormInstance, type FormRules } from 'element-plus'
  import { User, Lock, Grid } from '@element-plus/icons-vue'

  defineOptions({ name: 'Login' })

  const { t, locale } = useI18n()
  const formKey = ref(0)

  // 监听语言切换，重置表单
  watch(locale, () => {
    formKey.value++
  })

  const userStore = useUserStore()
  const router = useRouter()

  const systemName = AppConfig.systemInfo.name
  const formRef = ref<FormInstance>()

  const formData = reactive({
    username: 'admin',
    password: '123456',
    rememberPassword: true
  })

  const rules = computed<FormRules>(() => ({
    username: [{ required: true, message: t('login.placeholder.username'), trigger: 'blur' }],
    password: [{ required: true, message: t('login.placeholder.password'), trigger: 'blur' }]
  }))

  const loading = ref(false)

  // 登录
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      // 表单验证
      const valid = await formRef.value.validate()
      if (!valid) return

      loading.value = true

      // 登录请求
      const { username, password } = formData

      const { data } = await fetchLogin({
        username,
        password
      })

      const { token, refreshToken } = data

      if (!token) {
        throw new Error('登录失败 - 未收到 token')
      }

      // 存储 token
      userStore.setToken(token, refreshToken)

      // 获取用户信息
      const { data: userInfo } = await fetchGetUserInfo()
      userStore.setUserInfo(userInfo)
      userStore.setLoginStatus(true)

      // 登录成功处理
      showLoginSuccessNotice()
      router.push('/')
    } catch (error) {
      // HttpError 由 http 工具统一处理提示，此处无需额外操作
    } finally {
      loading.value = false
    }
  }

  // 登录成功提示
  const showLoginSuccessNotice = () => {
    setTimeout(() => {
      ElNotification({
        title: t('login.success.title'),
        type: 'success',
        duration: 2500,
        zIndex: 10000,
        message: `${t('login.success.message')}, ${systemName}!`
      })
    }, 150)
  }
</script>

<style lang="scss" scoped>
  @use './index';
</style>
