<!--
  页面名称：DetailComponents - 详情组件示例

  功能描述：
    展示各种详情组件的使用示例
    包含用户详情、订单详情、项目详情、产品详情

  路由信息：
    路径：/components/detail
    名称：DetailComponents
    是否缓存：否
-->

<template>
  <div class="detail-components-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="详情组件" left-arrow @click-left="onClickLeft" fixed placeholder />

    <!-- 内容区域 -->
    <div class="content">
      <!-- 用户详情 -->
      <div v-if="currentType === 'user'">
        <!-- 用户头像信息 -->
        <van-cell-group inset title="用户详情示例">
          <van-cell center>
            <template #icon>
              <van-image
                round
                width="60"
                height="60"
                :src="userDetail.avatar"
                style="margin-right: 12px"
              />
            </template>
            <template #title>
              <div class="user-name">{{ userDetail.name }}</div>
            </template>
            <template #label>
              <div class="user-desc">{{ userDetail.desc }}</div>
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 基本信息 -->
        <van-cell-group inset title="基本信息">
          <van-cell title="用户ID" :value="userDetail.id" />
          <van-cell title="手机号" :value="userDetail.phone" />
          <van-cell title="邮箱" :value="userDetail.email" />
          <van-cell title="性别" :value="userDetail.gender" />
          <van-cell title="生日" :value="userDetail.birthday" />
          <van-cell title="地址" :value="userDetail.address" />
        </van-cell-group>

        <!-- 账户信息 -->
        <van-cell-group inset title="账户信息">
          <van-cell title="注册时间" :value="userDetail.registerTime" />
          <van-cell title="最后登录" :value="userDetail.lastLoginTime" />
          <van-cell title="账户状态" :value="userDetail.status" />
        </van-cell-group>
      </div>

      <!-- 订单详情 -->
      <div v-if="currentType === 'order'">
        <!-- 订单状态 -->
        <van-cell-group inset title="订单详情示例">
          <van-steps :active="orderDetail.statusStep" active-color="#1171F8" style="padding: 16px 0">
            <van-step>提交订单</van-step>
            <van-step>支付完成</van-step>
            <van-step>商品发货</van-step>
            <van-step>确认收货</van-step>
          </van-steps>
        </van-cell-group>

        <!-- 订单信息 -->
        <van-cell-group inset title="订单信息">
          <van-cell title="订单编号" :value="orderDetail.orderNo" />
          <van-cell title="下单时间" :value="orderDetail.createTime" />
          <van-cell title="订单状态" :value="orderDetail.statusText" />
        </van-cell-group>

        <!-- 商品列表 -->
        <van-cell-group inset title="商品列表">
          <van-card
            v-for="item in orderDetail.goodsList"
            :key="item.id"
            :title="item.name"
            :desc="item.spec"
            :price="item.price"
            :num="item.num"
            :thumb="item.image"
          />
        </van-cell-group>

        <!-- 收货信息 -->
        <van-cell-group inset title="收货信息">
          <van-cell title="收货人" :value="orderDetail.receiver" />
          <van-cell title="联系电话" :value="orderDetail.phone" />
          <van-cell title="收货地址" :value="orderDetail.address" />
        </van-cell-group>

        <!-- 费用明细 -->
        <van-cell-group inset title="费用明细">
          <van-cell title="商品总额" :value="`¥${orderDetail.goodsAmount}`" />
          <van-cell title="运费" :value="`¥${orderDetail.freight}`" />
          <van-cell title="优惠金额" :value="`-¥${orderDetail.discount}`" />
          <van-cell title="实付金额" :value="`¥${orderDetail.totalAmount}`" value-class="total-amount" />
        </van-cell-group>
      </div>

      <!-- 项目详情 -->
      <div v-if="currentType === 'project'">
        <!-- 项目基本信息 -->
        <van-cell-group inset title="项目详情示例">
          <van-cell :title="projectDetail.name" :label="projectDetail.desc">
            <template #value>
              <van-tag :type="projectDetail.statusType">{{ projectDetail.statusText }}</van-tag>
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 项目进度 -->
        <van-cell-group inset title="项目进度">
          <van-cell title="完成进度">
            <template #value>
              <div style="display: flex; align-items: center; gap: 8px; width: 150px">
                <van-progress :percentage="projectDetail.progress" stroke-width="8" color="#1171F8" style="flex: 1" />
                <span style="font-size: 14px; font-weight: bold; color: #1171F8">{{ projectDetail.progress }}%</span>
              </div>
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 项目信息 -->
        <van-cell-group inset title="项目信息">
          <van-cell title="项目编号" :value="projectDetail.projectNo" />
          <van-cell title="项目负责人" :value="projectDetail.leader" />
          <van-cell title="开始时间" :value="projectDetail.startTime" />
          <van-cell title="结束时间" :value="projectDetail.endTime" />
          <van-cell title="项目预算" :value="`¥${projectDetail.budget}`" />
        </van-cell-group>

        <!-- 项目成员 -->
        <van-cell-group inset title="项目成员">
          <van-cell
            v-for="member in projectDetail.members"
            :key="member.id"
            :title="member.name"
            :label="member.role"
            center
          >
            <template #icon>
              <van-image
                round
                width="40"
                height="40"
                :src="member.avatar"
                style="margin-right: 12px"
              />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 产品详情 -->
      <div v-if="currentType === 'product'">
        <!-- 产品图片 -->
        <van-cell-group inset title="产品详情示例">
          <van-swipe :autoplay="3000" indicator-color="#1171F8">
            <van-swipe-item v-for="(image, index) in productDetail.images" :key="index">
              <van-image width="100%" height="300" :src="image" fit="cover" />
            </van-swipe-item>
          </van-swipe>
        </van-cell-group>

        <!-- 产品信息 -->
        <van-cell-group inset>
          <van-cell>
            <template #title>
              <div class="product-name">{{ productDetail.name }}</div>
            </template>
            <template #label>
              <div class="product-price">
                <span class="price-symbol">¥</span>
                <span class="price-value">{{ productDetail.price }}</span>
                <span class="price-original">¥{{ productDetail.originalPrice }}</span>
              </div>
              <div class="product-tags">
                <van-tag v-for="tag in productDetail.tags" :key="tag" plain type="primary" size="small">{{ tag }}</van-tag>
              </div>
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 产品规格 -->
        <van-cell-group inset title="选择规格">
          <van-cell title="颜色" :value="productDetail.selectedColor" is-link />
          <van-cell title="尺寸" :value="productDetail.selectedSize" is-link />
          <van-cell title="数量" :value="productDetail.num" is-link />
        </van-cell-group>

        <!-- 产品参数 -->
        <van-cell-group inset title="产品参数">
          <van-cell title="品牌" :value="productDetail.brand" />
          <van-cell title="型号" :value="productDetail.model" />
          <van-cell title="产地" :value="productDetail.origin" />
          <van-cell title="保修期" :value="productDetail.warranty" />
        </van-cell-group>

        <!-- 产品详情描述 -->
        <van-cell-group inset title="产品详情">
          <van-cell>
            <template #title>
              <div class="product-content">{{ productDetail.content }}</div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/**
 * 详情组件示例页面
 * 展示各种详情组件的使用示例
 */

// 路由实例
const router = useRouter()
const route = useRoute()

// 当前详情类型
const currentType = ref('user')

/**
 * 返回上一页
 */
const onClickLeft = () => {
  router.back()
}

// ========== Mock 数据 ==========

/**
 * 用户详情数据
 */
const userDetail = ref({
  id: 'U10001',
  name: '张三',
  desc: '产品经理 | 互联网从业者',
  avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
  phone: '138****8000',
  email: 'zhangsan@example.com',
  gender: '男',
  birthday: '1990-01-01',
  address: '广东省深圳市南山区科技园',
  registerTime: '2023-01-15 10:30:00',
  lastLoginTime: '2024-12-27 15:20:00',
  status: '正常'
})

/**
 * 订单详情数据
 */
const orderDetail = ref({
  orderNo: 'DD202412270001',
  createTime: '2024-12-27 10:30:00',
  statusStep: 2,
  statusText: '已发货',
  goodsList: [
    {
      id: 1,
      name: 'iPhone 15 Pro Max',
      spec: '深空黑 256GB',
      price: 9999,
      num: 1,
      image: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
    },
    {
      id: 2,
      name: 'AirPods Pro 2',
      spec: '白色',
      price: 1999,
      num: 1,
      image: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
    }
  ],
  receiver: '张三',
  phone: '138****8000',
  address: '广东省深圳市南山区科技园南区',
  goodsAmount: 11998,
  freight: 0,
  discount: 100,
  totalAmount: 11898
})

/**
 * 项目详情数据
 */
const projectDetail = ref({
  name: 'H5移动端框架开发',
  desc: '基于Vue3+Vite开发的移动端H5框架，包含常用组件和页面模板',
  statusType: 'primary',
  statusText: '进行中',
  progress: 65,
  projectNo: 'PRJ20241201',
  leader: '李四',
  startTime: '2024-12-01',
  endTime: '2025-03-31',
  budget: 500000,
  members: [
    {
      id: 1,
      name: '李四',
      role: '项目经理',
      avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
    },
    {
      id: 2,
      name: '王五',
      role: '前端工程师',
      avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
    },
    {
      id: 3,
      name: '赵六',
      role: 'UI设计师',
      avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
    }
  ]
})

/**
 * 产品详情数据
 */
const productDetail = ref({
  name: 'iPhone 15 Pro Max',
  price: 9999,
  originalPrice: 10999,
  tags: ['官方正品', '顺丰包邮', '7天无理由退换'],
  images: [
    'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
  ],
  selectedColor: '深空黑',
  selectedSize: '256GB',
  num: 1,
  brand: 'Apple',
  model: 'iPhone 15 Pro Max',
  origin: '中国',
  warranty: '1年',
  content: 'iPhone 15 Pro Max 采用钛金属设计，搭载 A17 Pro 芯片，配备 6.7 英寸超视网膜 XDR 显示屏，支持 ProMotion 自适应刷新率技术。后置 4800 万像素主摄，支持 5 倍光学变焦。'
})

// 生命周期钩子
onMounted(() => {
  // 获取路由参数，确定显示哪个详情
  const type = route.query.type || 'user'
  currentType.value = type
})
</script>

<style scoped>
/* 页面容器 */
.detail-components-page {
  min-height: 100vh;
  background-color: var(--bg-page);
}

/* 内容区域 */
.content {
  padding: var(--spacing-md);
}

/* 用户名称 */
.user-name {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
}

/* 用户描述 */
.user-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 总金额 */
.total-amount {
  font-size: 16px;
  font-weight: bold;
  color: var(--danger-color);
}

/* 产品名称 */
.product-name {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

/* 产品价格 */
.product-price {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.price-symbol {
  font-size: 16px;
  color: var(--danger-color);
}

.price-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--danger-color);
}

.price-original {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: line-through;
}

/* 产品标签 */
.product-tags {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

/* 产品详情内容 */
.product-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
}
</style>
