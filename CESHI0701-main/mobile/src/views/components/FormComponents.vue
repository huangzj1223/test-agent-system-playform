<!--
  页面名称：FormComponents - 表单组件示例

  功能描述：
    展示各种表单组件的使用示例
    包含基础表单、复杂表单、登记表单

  路由信息：
    路径：/components/form
    名称：FormComponents
    是否缓存：否
-->

<template>
  <div class="form-components-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="表单组件" left-arrow @click-left="onClickLeft" fixed placeholder />

    <!-- 内容区域 -->
    <div class="content">
      <!-- 基础表单 -->
      <div v-if="currentType === 'basic'" class="form-section">
        <van-form @submit="onSubmitBasic">
          <van-cell-group inset title="基础表单示例">
            <van-field
              v-model="basicForm.username"
              name="username"
              label="用户名"
              placeholder="请输入用户名"
              :rules="[{ required: true, message: '请填写用户名' }]"
            />
            <van-field
              v-model="basicForm.password"
              type="password"
              name="password"
              label="密码"
              placeholder="请输入密码"
              :rules="[{ required: true, message: '请填写密码' }]"
            />
            <van-field
              v-model="basicForm.phone"
              type="tel"
              name="phone"
              label="手机号"
              placeholder="请输入手机号"
              :rules="[{ required: true, message: '请填写手机号' }]"
            />
            <van-field
              v-model="basicForm.email"
              type="email"
              name="email"
              label="邮箱"
              placeholder="请输入邮箱"
            />
            <van-field name="gender" label="性别">
              <template #input>
                <van-radio-group v-model="basicForm.gender" direction="horizontal">
                  <van-radio name="1">男</van-radio>
                  <van-radio name="2">女</van-radio>
                </van-radio-group>
              </template>
            </van-field>
            <van-field
              v-model="basicForm.birthday"
              is-link
              readonly
              name="birthday"
              label="生日"
              placeholder="点击选择日期"
              @click="showDatePicker = true"
            />
            <van-field name="switch" label="开关">
              <template #input>
                <van-switch v-model="basicForm.switch" />
              </template>
            </van-field>
          </van-cell-group>
        </van-form>
      </div>

      <!-- 复杂表单 -->
      <div v-if="currentType === 'complex'" class="form-section">
        <van-cell-group inset title="复杂表单示例（多步骤）">
          <van-steps :active="complexForm.step" active-color="#1171F8" style="padding: 16px 0">
            <van-step>基本信息</van-step>
            <van-step>详细信息</van-step>
            <van-step>确认提交</van-step>
          </van-steps>
        </van-cell-group>

        <!-- 步骤1：基本信息 -->
        <van-form v-if="complexForm.step === 0" @submit="nextStep">
          <van-cell-group inset>
            <van-field
              v-model="complexForm.name"
              name="name"
              label="姓名"
              placeholder="请输入姓名"
              :rules="[{ required: true, message: '请填写姓名' }]"
            />
            <van-field
              v-model="complexForm.idCard"
              name="idCard"
              label="身份证号"
              placeholder="请输入身份证号"
              :rules="[{ required: true, message: '请填写身份证号' }]"
            />
          </van-cell-group>
        </van-form>

        <!-- 步骤2：详细信息 -->
        <van-form v-if="complexForm.step === 1" @submit="nextStep">
          <van-cell-group inset>
            <van-field
              v-model="complexForm.address"
              name="address"
              label="地址"
              placeholder="请输入地址"
              :rules="[{ required: true, message: '请填写地址' }]"
            />
            <van-field
              v-model="complexForm.company"
              name="company"
              label="公司"
              placeholder="请输入公司名称"
            />
          </van-cell-group>
        </van-form>

        <!-- 步骤3：确认提交 -->
        <van-cell-group v-if="complexForm.step === 2" inset>
          <van-cell title="姓名" :value="complexForm.name" />
          <van-cell title="身份证号" :value="complexForm.idCard" />
          <van-cell title="地址" :value="complexForm.address" />
          <van-cell title="公司" :value="complexForm.company" />
        </van-cell-group>
      </div>

      <!-- 登记表单 -->
      <div v-if="currentType === 'register'" class="form-section">
        <van-form @submit="onSubmitRegister">
          <van-cell-group inset title="登记表单示例">
            <van-field
              v-model="registerForm.realName"
              name="realName"
              label="真实姓名"
              placeholder="请输入真实姓名"
              :rules="[{ required: true, message: '请填写真实姓名' }]"
            />
            <van-field
              v-model="registerForm.phone"
              type="tel"
              name="phone"
              label="手机号"
              placeholder="请输入手机号"
              :rules="[{ required: true, message: '请填写手机号' }]"
            />
            <van-field
              v-model="registerForm.verifyCode"
              name="verifyCode"
              label="验证码"
              placeholder="请输入验证码"
              :rules="[{ required: true, message: '请填写验证码' }]"
            >
              <template #button>
                <van-button size="small" type="primary" :disabled="countdown > 0" @click="sendCode">
                  {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
                </van-button>
              </template>
            </van-field>
            <van-field
              v-model="registerForm.password"
              type="password"
              name="password"
              label="设置密码"
              placeholder="请输入密码"
              :rules="[{ required: true, message: '请填写密码' }]"
            />
            <van-field
              v-model="registerForm.confirmPassword"
              type="password"
              name="confirmPassword"
              label="确认密码"
              placeholder="请再次输入密码"
              :rules="[{ required: true, message: '请再次输入密码' }]"
            />
            <van-field name="agree">
              <template #input>
                <van-checkbox v-model="registerForm.agree">
                  我已阅读并同意<span class="link-text">《用户协议》</span>和<span class="link-text">《隐私政策》</span>
                </van-checkbox>
              </template>
            </van-field>
          </van-cell-group>
        </van-form>
      </div>
    </div>

    <!-- 固定底部按钮 -->
    <div class="fixed-button">
      <!-- 基础表单按钮 -->
      <van-button
        v-if="currentType === 'basic'"
        round
        block
        type="primary"
        @click="onSubmitBasic"
      >
        提交
      </van-button>

      <!-- 复杂表单按钮 -->
      <template v-if="currentType === 'complex'">
        <van-button
          v-if="complexForm.step === 0"
          round
          block
          type="primary"
          @click="nextStep"
        >
          下一步
        </van-button>
        <template v-if="complexForm.step === 1">
          <van-button round block plain type="primary" @click="prevStep">上一步</van-button>
          <van-button round block type="primary" @click="nextStep" style="margin-top: 12px">
            下一步
          </van-button>
        </template>
        <template v-if="complexForm.step === 2">
          <van-button round block plain type="primary" @click="prevStep">上一步</van-button>
          <van-button round block type="primary" @click="onSubmitComplex" style="margin-top: 12px">
            提交
          </van-button>
        </template>
      </template>

      <!-- 登记表单按钮 -->
      <van-button
        v-if="currentType === 'register'"
        round
        block
        type="primary"
        @click="onSubmitRegister"
      >
        注册
      </van-button>
    </div>

    <!-- 日期选择器 -->
    <van-popup v-model:show="showDatePicker" position="bottom">
      <van-date-picker
        v-model="currentDate"
        title="选择日期"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onConfirmDate"
        @cancel="showDatePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'

/**
 * 表单组件示例页面
 * 展示各种表单组件的使用示例
 */

// 路由实例
const router = useRouter()
const route = useRoute()

// 当前表单类型
const currentType = ref('basic')

/**
 * 返回上一页
 */
const onClickLeft = () => {
  router.back()
}

// ========== 基础表单 ==========

/**
 * 基础表单数据
 */
const basicForm = ref({
  username: '',
  password: '',
  phone: '',
  email: '',
  gender: '1',
  birthday: '',
  switch: false
})

// 日期选择器
const showDatePicker = ref(false)
const currentDate = ref(['2024', '01', '01'])
const minDate = new Date(1900, 0, 1)
const maxDate = new Date(2030, 11, 31)

/**
 * 确认选择日期
 */
const onConfirmDate = ({ selectedValues }) => {
  basicForm.value.birthday = selectedValues.join('-')
  showDatePicker.value = false
}

/**
 * 提交基础表单
 */
const onSubmitBasic = () => {
  if (!basicForm.value.username || !basicForm.value.password || !basicForm.value.phone) {
    showToast('请填写必填项')
    return
  }
  console.log('基础表单提交：', basicForm.value)
  showToast('提交成功')
}

// ========== 复杂表单 ==========

/**
 * 复杂表单数据
 */
const complexForm = ref({
  step: 0,
  name: '',
  idCard: '',
  address: '',
  company: ''
})

/**
 * 下一步
 */
const nextStep = () => {
  if (complexForm.value.step === 0) {
    if (!complexForm.value.name || !complexForm.value.idCard) {
      showToast('请填写必填项')
      return
    }
  }
  if (complexForm.value.step === 1) {
    if (!complexForm.value.address) {
      showToast('请填写必填项')
      return
    }
  }
  complexForm.value.step++
}

/**
 * 上一步
 */
const prevStep = () => {
  complexForm.value.step--
}

/**
 * 提交复杂表单
 */
const onSubmitComplex = () => {
  console.log('复杂表单提交：', complexForm.value)
  showToast('提交成功')
}

// ========== 登记表单 ==========

/**
 * 登记表单数据
 */
const registerForm = ref({
  realName: '',
  phone: '',
  verifyCode: '',
  password: '',
  confirmPassword: '',
  agree: false
})

// 验证码倒计时
const countdown = ref(0)

/**
 * 发送验证码
 */
const sendCode = () => {
  if (!registerForm.value.phone) {
    showToast('请先输入手机号')
    return
  }
  showToast('验证码已发送')
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

/**
 * 提交登记表单
 */
const onSubmitRegister = () => {
  if (!registerForm.value.realName || !registerForm.value.phone || !registerForm.value.verifyCode || !registerForm.value.password || !registerForm.value.confirmPassword) {
    showToast('请填写必填项')
    return
  }
  if (!registerForm.value.agree) {
    showToast('请先同意用户协议和隐私政策')
    return
  }
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    showToast('两次输入的密码不一致')
    return
  }
  console.log('登记表单提交：', registerForm.value)
  showToast('注册成功')
}

// 生命周期钩子
onMounted(() => {
  // 获取路由参数，确定显示哪个表单
  const type = route.query.type || 'basic'
  currentType.value = type
})
</script>

<style scoped>
/* 页面容器 */
.form-components-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding-bottom: 80px;
}

/* 内容区域 */
.content {
  padding: var(--spacing-md);
}

/* 表单区域 */
.form-section {
  margin-bottom: var(--spacing-md);
}

/* 固定底部按钮 */
.fixed-button {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--spacing-md);
  background-color: var(--bg-card);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  z-index: 999;
}

/* 链接文字 */
.link-text {
  color: var(--primary-color);
}
</style>
