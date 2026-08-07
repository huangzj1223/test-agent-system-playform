<!--
  页面名称：ListComponents - 列表组件示例

  功能描述：
    展示各种列表组件的使用示例
    包含基础列表、搜索筛选列表、滚动加载列表、卡片列表

  路由信息：
    路径：/components/list
    名称：ListComponents
    是否缓存：否
-->

<template>
  <div class="list-components-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="列表组件" left-arrow @click-left="onClickLeft" fixed placeholder />

    <!-- 搜索筛选区域（固定在顶部） -->
    <div v-if="currentType === 'search'" class="search-filter-area">
      <!-- 搜索框 -->
      <van-search
        v-model="searchKeyword"
        placeholder="请输入搜索关键词"
        @search="onSearch"
      />

      <!-- 筛选条件 -->
      <van-dropdown-menu>
        <van-dropdown-item v-model="filterStatus" :options="statusOptions" @change="onFilterChange" />
        <van-dropdown-item v-model="filterType" :options="typeOptions" @change="onFilterChange" />
      </van-dropdown-menu>
    </div>

    <!-- 内容区域 -->
    <div class="content" :class="{ 'has-search-filter': currentType === 'search' }">
      <!-- 基础列表 -->
      <div v-if="currentType === 'basic'">
        <van-cell-group inset title="基础列表示例">
          <van-cell
            v-for="item in basicList"
            :key="item.id"
            :title="item.name"
            :value="item.value"
            :label="item.desc"
            is-link
            @click="handleItemClick(item)"
          />
        </van-cell-group>
      </div>

      <!-- 搜索筛选列表 -->
      <div v-if="currentType === 'search'">
        <!-- 列表 -->
        <van-cell-group inset title="搜索筛选列表示例">
          <van-cell
            v-for="item in filteredList"
            :key="item.id"
            :title="item.name"
            :label="item.desc"
            is-link
            @click="handleItemClick(item)"
          >
            <template #value>
              <van-tag :type="item.statusType">{{ item.statusText }}</van-tag>
            </template>
          </van-cell>
          <van-empty v-if="filteredList.length === 0" description="暂无数据" />
        </van-cell-group>
      </div>

      <!-- 滚动加载列表 -->
      <div v-if="currentType === 'scroll'">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list
            v-model:loading="loading"
            :finished="finished"
            finished-text="没有更多了"
            @load="onLoad"
          >
            <van-cell-group inset title="滚动加载列表示例">
              <van-cell
                v-for="item in scrollList"
                :key="item.id"
                :title="item.name"
                :label="item.desc"
                is-link
                @click="handleItemClick(item)"
              />
            </van-cell-group>
          </van-list>
        </van-pull-refresh>
      </div>

      <!-- 卡片列表 -->
      <div v-if="currentType === 'card'">
        <van-cell-group inset title="卡片列表示例" />
        <div class="card-list">
          <div v-for="item in cardList" :key="item.id" class="card-item" @click="handleItemClick(item)">
            <van-image
              width="100%"
              height="150"
              :src="item.image"
              fit="cover"
            />
            <div class="card-content">
              <div class="card-title">{{ item.name }}</div>
              <div class="card-desc">{{ item.desc }}</div>
              <div class="card-footer">
                <span class="card-price">¥{{ item.price }}</span>
                <van-tag :type="item.tagType">{{ item.tagText }}</van-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'

/**
 * 列表组件示例页面
 * 展示各种列表组件的使用示例
 */

// 路由实例
const router = useRouter()
const route = useRoute()

// 当前列表类型
const currentType = ref('basic')

/**
 * 返回上一页
 */
const onClickLeft = () => {
  router.back()
}

/**
 * 列表项点击事件
 */
const handleItemClick = (item) => {
  showToast(`点击了：${item.name}`)
}

// ========== 基础列表 ==========

/**
 * 基础列表数据
 */
const basicList = ref([
  { id: 1, name: '用户管理', value: '100', desc: '管理系统用户信息' },
  { id: 2, name: '角色管理', value: '20', desc: '管理用户角色权限' },
  { id: 3, name: '菜单管理', value: '50', desc: '管理系统菜单配置' },
  { id: 4, name: '部门管理', value: '30', desc: '管理组织架构部门' },
  { id: 5, name: '岗位管理', value: '40', desc: '管理岗位信息' },
  { id: 6, name: '字典管理', value: '80', desc: '管理系统字典数据' },
  { id: 7, name: '参数管理', value: '60', desc: '管理系统参数配置' },
  { id: 8, name: '通知公告', value: '90', desc: '管理系统通知公告' }
])

// ========== 搜索筛选列表 ==========

/**
 * 搜索关键词
 */
const searchKeyword = ref('')

/**
 * 筛选状态
 */
const filterStatus = ref(0)

/**
 * 筛选类型
 */
const filterType = ref(0)

/**
 * 状态选项
 */
const statusOptions = [
  { text: '全部状态', value: 0 },
  { text: '进行中', value: 1 },
  { text: '已完成', value: 2 },
  { text: '已取消', value: 3 }
]

/**
 * 类型选项
 */
const typeOptions = [
  { text: '全部类型', value: 0 },
  { text: '项目', value: 1 },
  { text: '任务', value: 2 },
  { text: '需求', value: 3 }
]

/**
 * 搜索筛选列表原始数据
 */
const searchList = ref([
  { id: 1, name: 'H5移动端框架开发', desc: '2024-12-01', status: 1, statusText: '进行中', statusType: 'primary', type: 1 },
  { id: 2, name: '后台管理系统优化', desc: '2024-12-05', status: 2, statusText: '已完成', statusType: 'success', type: 1 },
  { id: 3, name: '用户反馈处理', desc: '2024-12-10', status: 1, statusText: '进行中', statusType: 'primary', type: 2 },
  { id: 4, name: '数据统计功能', desc: '2024-12-15', status: 3, statusText: '已取消', statusType: 'danger', type: 3 },
  { id: 5, name: '性能优化任务', desc: '2024-12-20', status: 2, statusText: '已完成', statusType: 'success', type: 2 },
  { id: 6, name: '新功能需求评审', desc: '2024-12-25', status: 1, statusText: '进行中', statusType: 'primary', type: 3 }
])

/**
 * 过滤后的列表
 */
const filteredList = computed(() => {
  let list = searchList.value

  // 搜索过滤
  if (searchKeyword.value) {
    list = list.filter((item) => item.name.includes(searchKeyword.value))
  }

  // 状态过滤
  if (filterStatus.value !== 0) {
    list = list.filter((item) => item.status === filterStatus.value)
  }

  // 类型过滤
  if (filterType.value !== 0) {
    list = list.filter((item) => item.type === filterType.value)
  }

  return list
})

/**
 * 搜索事件
 */
const onSearch = () => {
  showToast(`搜索：${searchKeyword.value}`)
}

/**
 * 筛选变化事件
 */
const onFilterChange = () => {
  showToast('筛选条件已更新')
}

// ========== 滚动加载列表 ==========

/**
 * 滚动列表数据
 */
const scrollList = ref([])

/**
 * 加载状态
 */
const loading = ref(false)

/**
 * 是否加载完成
 */
const finished = ref(false)

/**
 * 刷新状态
 */
const refreshing = ref(false)

/**
 * 当前页码
 */
const currentPage = ref(0)

/**
 * 加载数据
 */
const onLoad = () => {
  setTimeout(() => {
    currentPage.value++

    // 模拟加载数据
    const newData = []
    for (let i = 1; i <= 10; i++) {
      const id = (currentPage.value - 1) * 10 + i
      newData.push({
        id,
        name: `列表项 ${id}`,
        desc: `这是第 ${id} 条数据`
      })
    }

    scrollList.value.push(...newData)
    loading.value = false

    // 数据加载完成
    if (currentPage.value >= 5) {
      finished.value = true
    }
  }, 1000)
}

/**
 * 下拉刷新
 */
const onRefresh = () => {
  setTimeout(() => {
    scrollList.value = []
    currentPage.value = 0
    finished.value = false
    refreshing.value = false
    loading.value = true
    onLoad()
  }, 1000)
}

// ========== 卡片列表 ==========

/**
 * 卡片列表数据
 */
const cardList = ref([
  {
    id: 1,
    name: 'iPhone 15 Pro Max',
    desc: '钛金属设计 | A17 Pro芯片',
    price: 9999,
    image: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    tagText: '热销',
    tagType: 'danger'
  },
  {
    id: 2,
    name: 'MacBook Pro 16',
    desc: 'M3 Max芯片 | 36GB内存',
    price: 25999,
    image: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    tagText: '新品',
    tagType: 'primary'
  },
  {
    id: 3,
    name: 'iPad Pro 12.9',
    desc: 'M2芯片 | 妙控键盘',
    price: 8999,
    image: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    tagText: '推荐',
    tagType: 'success'
  },
  {
    id: 4,
    name: 'AirPods Pro 2',
    desc: '主动降噪 | 空间音频',
    price: 1999,
    image: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    tagText: '热销',
    tagType: 'danger'
  },
  {
    id: 5,
    name: 'Apple Watch Ultra 2',
    desc: '钛金属表壳 | 49mm',
    price: 6499,
    image: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    tagText: '新品',
    tagType: 'primary'
  },
  {
    id: 6,
    name: 'HomePod mini',
    desc: '智能音箱 | 空间音频',
    price: 749,
    image: 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
    tagText: '推荐',
    tagType: 'success'
  }
])

// 生命周期钩子
onMounted(() => {
  // 获取路由参数，确定显示哪个列表
  const type = route.query.type || 'basic'
  currentType.value = type

  // 如果是滚动加载列表，初始化加载数据
  if (type === 'scroll') {
    loading.value = true
    onLoad()
  }
})
</script>

<style scoped>
/* 页面容器 */
.list-components-page {
  min-height: 100vh;
  background-color: var(--bg-page);
}

/* 内容区域 */
.content {
  padding: var(--spacing-md);
}

/* 有搜索筛选时的内容区域 */
.content.has-search-filter {
  padding-top: 110px;
}

/* 搜索筛选区域 */
.search-filter-area {
  position: fixed;
  top: 46px;
  left: 0;
  right: 0;
  background-color: var(--bg-card);
  z-index: 99;
}

/* 卡片列表 */
.card-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

/* 卡片项 */
.card-item {
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.card-item:active {
  transform: scale(0.98);
}

/* 卡片内容 */
.card-content {
  padding: var(--spacing-sm);
}

/* 卡片标题 */
.card-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 卡片描述 */
.card-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 卡片价格 */
.card-price {
  font-size: 16px;
  font-weight: bold;
  color: var(--danger-color);
}
</style>
