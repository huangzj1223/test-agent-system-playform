<!--
  页面名称：ChartsDemo - 图表组件示例

  功能描述：
    展示所有 ECharts 图表组件的使用示例
    包含基础柱状图、多组柱状图、堆叠柱状图、折线图、饼图

  路由信息：
    路径：/charts/demo
    名称：ChartsDemo
    是否缓存：否
-->

<template>
  <div class="charts-demo-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar title="图表组件" left-arrow @click-left="onClickLeft" fixed placeholder />

    <!-- 内容区域 -->
    <div class="content">
      <!-- 基础柱状图 -->
      <div class="chart-section">
        <div class="section-title">基础柱状图</div>
        <div class="chart-card">
          <BarChart
            :data="barChartData.data"
            :xAxisData="barChartData.xAxisData"
            height="300px"
          />
        </div>
      </div>

      <!-- 多组柱状图 -->
      <div class="chart-section">
        <div class="section-title">多组柱状图</div>
        <div class="chart-card">
          <MultiBarChart
            :seriesData="multiBarChartData.seriesData"
            :xAxisData="multiBarChartData.xAxisData"
            height="300px"
          />
        </div>
      </div>

      <!-- 堆叠柱状图 -->
      <div class="chart-section">
        <div class="section-title">堆叠柱状图</div>
        <div class="chart-card">
          <StackBarChart
            :seriesData="stackBarChartData.seriesData"
            :xAxisData="stackBarChartData.xAxisData"
            height="300px"
          />
        </div>
      </div>

      <!-- 折线图 -->
      <div class="chart-section">
        <div class="section-title">折线图</div>
        <div class="chart-card">
          <LineChart
            :seriesData="lineChartData.seriesData"
            :xAxisData="lineChartData.xAxisData"
            :smooth="true"
            :area="true"
            height="300px"
          />
        </div>
      </div>

      <!-- 饼图 -->
      <div class="chart-section">
        <div class="section-title">饼图（环形图）</div>
        <div class="chart-card">
          <PieChart
            :data="pieChartData.data"
            :radius="['40%', '70%']"
            height="300px"
          />
        </div>
      </div>

      <!-- 雷达图 -->
      <div class="chart-section">
        <div class="section-title">雷达图</div>
        <div class="chart-card">
          <RadarChart
            :indicator="radarChartData.indicator"
            :seriesData="radarChartData.seriesData"
            height="300px"
          />
        </div>
      </div>

      <!-- 玫瑰图 -->
      <div class="chart-section">
        <div class="section-title">玫瑰图</div>
        <div class="chart-card">
          <RoseChart
            :data="roseChartData.data"
            height="300px"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { BarChart, MultiBarChart, StackBarChart, LineChart, PieChart, RadarChart, RoseChart } from '@/components/Common/Charts'

/**
 * 图表组件示例页面
 * 展示所有 ECharts 图表组件的使用示例
 */

// 路由实例
const router = useRouter()

/**
 * 返回上一页
 */
const onClickLeft = () => {
  router.back()
}

// ========== Mock 数据 ==========

/**
 * 基础柱状图数据
 */
const barChartData = ref({
  data: [120, 200, 150, 80, 70, 110],
  xAxisData: ['1月', '2月', '3月', '4月', '5月', '6月']
})

/**
 * 多组柱状图数据
 */
const multiBarChartData = ref({
  seriesData: [
    { name: '销售额', data: [120, 200, 150, 80, 70, 110] },
    { name: '利润', data: [80, 120, 100, 50, 40, 70] }
  ],
  xAxisData: ['1月', '2月', '3月', '4月', '5月', '6月'],
  legend: ['销售额', '利润']
})

/**
 * 堆叠柱状图数据
 */
const stackBarChartData = ref({
  seriesData: [
    { name: '直接访问', data: [320, 302, 301, 334, 390, 330] },
    { name: '邮件营销', data: [120, 132, 101, 134, 90, 230] },
    { name: '联盟广告', data: [220, 182, 191, 234, 290, 330] }
  ],
  xAxisData: ['周一', '周二', '周三', '周四', '周五', '周六'],
  legend: ['直接访问', '邮件营销', '联盟广告']
})

/**
 * 折线图数据
 */
const lineChartData = ref({
  seriesData: [
    { name: '销售额', data: [120, 200, 150, 80, 70, 110] },
    { name: '利润', data: [80, 120, 100, 50, 40, 70] }
  ],
  xAxisData: ['1月', '2月', '3月', '4月', '5月', '6月'],
  legend: ['销售额', '利润']
})

/**
 * 饼图数据
 */
const pieChartData = ref({
  data: [
    { name: '直接访问', value: 335 },
    { name: '邮件营销', value: 310 },
    { name: '联盟广告', value: 234 },
    { name: '视频广告', value: 135 },
    { name: '搜索引擎', value: 1548 }
  ]
})

/**
 * 雷达图数据
 */
const radarChartData = ref({
  indicator: [
    { name: '销售', max: 100 },
    { name: '管理', max: 100 },
    { name: '技术', max: 100 },
    { name: '支持', max: 100 },
    { name: '市场', max: 100 }
  ],
  seriesData: [
    { name: '预算', value: [43, 85, 70, 60, 75] },
    { name: '实际', value: [50, 80, 90, 70, 85] }
  ]
})

/**
 * 玫瑰图数据
 */
const roseChartData = ref({
  data: [
    { name: '直接访问', value: 335 },
    { name: '邮件营销', value: 310 },
    { name: '联盟广告', value: 234 },
    { name: '视频广告', value: 135 },
    { name: '搜索引擎', value: 200 }
  ]
})
</script>

<style scoped>
/* 页面容器 */
.charts-demo-page {
  min-height: 100vh;
  background-color: var(--bg-page);
}

/* 内容区域 */
.content {
  padding: var(--spacing-md);
}

/* 图表区域 */
.chart-section {
  margin-bottom: var(--spacing-xl);
}

/* 区域标题 */
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
  padding-left: var(--spacing-sm);
  border-left: 4px solid var(--primary-color);
}

/* 图表卡片 */
.chart-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}
</style>
