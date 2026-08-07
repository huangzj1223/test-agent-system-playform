<template>
  <ElDrawer
    v-model="drawerVisible"
    direction="rtl"
    size="640px"
    :with-header="false"
    :destroy-on-close="true"
    class="waybill-detail-drawer"
    @open="fetchDetail"
    @closed="handleClosed"
  >
    <ElScrollbar v-loading="loading" class="detail-scrollbar">
      <div class="detail-drawer">
      <!-- 顶部栏 -->
      <div class="drawer-header">
        <div class="header-title">{{ detail ? (detail.waybillNo || '草稿') : '运单详情' }}</div>
        <div class="header-close" @click="drawerVisible = false">
          <ElIcon><Close /></ElIcon>
        </div>
      </div>

      <template v-if="detail">
        <!-- 地图区（在途/到库/待接卸/已完成时展示） -->
        <div v-if="showMap" class="map-wrapper">
          <div ref="mapRef" class="map-container"></div>
          <div class="map-overlay">
            <span :class="['map-status-badge', `status-${detail.status}`]">{{ STATUS_LABELS[detail.status] }}</span>
            <span class="map-plate">{{ detail.plateNo }}</span>
          </div>
          <div class="map-fade-bottom"></div>
        </div>

        <!-- 进度条 -->
        <div class="progress-card">
          <div class="progress-steps">
            <div v-for="(step, idx) in progressSteps" :key="step.key" class="progress-step">
              <div class="step-dot-wrap">
                <div :class="['step-dot', step.done ? 'done' : step.active ? 'active' : '']">
                  <svg v-if="step.done" viewBox="0 0 14 14" fill="none" width="11" height="11">
                    <path d="M3 7l3 3 5-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span v-else-if="step.active" class="step-dot-pulse"></span>
                </div>
                <div v-if="idx < progressSteps.length - 1" :class="['step-line', step.done ? 'line-done' : 'line-pending']"></div>
              </div>
              <span :class="['step-label', step.active ? 'active' : step.done ? 'done-label' : '']">{{ step.label }}</span>
            </div>
          </div>
          <div v-if="latestLog" class="latest-log">
            <span class="latest-dot"></span>
            <div class="latest-text">
              <span class="latest-remark">{{ latestLog.remark }}</span>
              <span class="latest-time">{{ latestLog.operatedAt }}</span>
            </div>
          </div>
        </div>

        <!-- 主信息卡 -->
        <div class="info-card">
          <div class="info-route">
            <div class="info-endpoint">
              <span class="endpoint-tag origin">发</span>
              <span class="endpoint-name">{{ detail.refineryName }}</span>
            </div>
            <svg class="route-arrow" viewBox="0 0 28 10" fill="none">
              <path d="M0 5h22M18 1.5l5 3.5-5 3.5" stroke="#c8c9cc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="info-endpoint info-endpoint-right">
              <span class="endpoint-name">{{ detail.depotName }}</span>
              <span class="endpoint-tag dest">收</span>
            </div>
          </div>
          <div class="info-divider"></div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">油品</span>
              <span class="info-value">{{ detail.oilType }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">计划总量</span>
              <span class="info-value">{{ detail.planWeight }} T</span>
            </div>
            <div class="info-item">
              <span class="info-label">承运商</span>
              <span class="info-value">{{ detail.carrierName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">司机</span>
              <span class="info-value">{{ detail.driverName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">车牌号</span>
              <span class="info-value">{{ detail.plateNo }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">创建人</span>
              <span class="info-value">{{ detail.createdBy }}</span>
            </div>
            <div class="info-item info-item-full">
              <span class="info-label">计划发货时间</span>
              <span class="info-value">{{ detail.planDepartTime || '-' }}</span>
            </div>
            <div class="info-item info-item-full">
              <span class="info-label">实际发货时间</span>
              <span class="info-value">{{ detail.departTime || '-' }}</span>
            </div>
            <div v-if="detail.loadConfirmWeight" class="info-item">
              <span class="info-label">装车总量</span>
              <span class="info-value highlight">{{ detail.loadConfirmWeight }} T</span>
            </div>
            <div v-if="detail.outboundWeight" class="info-item">
              <span class="info-label">出厂过磅</span>
              <span class="info-value highlight">{{ detail.outboundWeight }} T</span>
            </div>
            <div v-if="detail.inboundWeight" class="info-item">
              <span class="info-label">入库过磅</span>
              <span class="info-value highlight">{{ detail.inboundWeight }} T</span>
            </div>
            <div v-if="detail.actualWeight" class="info-item">
              <span class="info-label">实际接卸</span>
              <span class="info-value highlight">{{ detail.actualWeight }} T</span>
            </div>
            <div class="info-item info-item-full">
              <span class="info-label">创建时间</span>
              <span class="info-value">{{ detail.createdAt }}</span>
            </div>
          </div>
        </div>

        <!-- 物流动态 -->
        <div class="timeline-card">
          <div class="timeline-title">物流动态</div>
          <div v-if="detail.statusLogs?.length" class="timeline-list">
            <div
              v-for="(log, idx) in reversedLogs"
              :key="log.id"
              :class="['timeline-item', idx === 0 ? 'timeline-item-active' : '']"
            >
              <div class="timeline-dot-wrap">
                <div :class="['timeline-dot', idx === 0 ? 'active' : '']"></div>
                <div v-if="idx < reversedLogs.length - 1" class="timeline-line"></div>
              </div>
              <div class="timeline-content">
                <div class="timeline-remark">{{ log.remark }}</div>
                <div class="timeline-meta">
                  <span class="timeline-time">{{ log.operatedAt }}</span>
                  <span class="timeline-operator">操作人：{{ log.operatedBy }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-logs">暂无物流动态</div>
        </div>
      </template>
      </div>
    </ElScrollbar>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { Close } from '@element-plus/icons-vue'
  import { getWaybillDetail, STATUS_LABELS, type Waybill, type WaybillStatusLog } from '@/api/waybill'

  const props = defineProps<{ visible: boolean; waybillId: number | null }>()
  const emit = defineEmits<{ 'update:visible': [val: boolean] }>()

  defineOptions({ name: 'WaybillDetail' })

  const drawerVisible = computed({ get: () => props.visible, set: val => emit('update:visible', val) })

  const loading = ref(false)
  const detail = ref<(Waybill & { statusLogs: WaybillStatusLog[] }) | null>(null)
  const mapRef = ref<HTMLDivElement | null>(null)
  let amapInstance: any = null

  // 内蒙古真实坐标（与 mobile 一致，高德 GCJ-02）
  const LOCATION_MAP: Record<string, [number, number]> = {
    '内蒙古炼化公司':  [111.1823, 40.2156],
    '鄂尔多斯炼油厂':  [109.9756, 39.5642],
    '包头石化公司':    [109.8401, 40.6423],
    '呼和浩特油库':    [111.7519, 40.8414],
    '鄂尔多斯油库':    [109.9763, 39.8122],
    '包头储油基地':    [109.8012, 40.6589]
  }

  // 在途车辆模拟位置（与 mobile 一致）
  const VEHICLE_POS: Record<string, [number, number]> = {
    'YM202601100001': [111.4231, 40.5012],
    'YM202601150001': [109.9720, 39.6801]
  }

  // 车辆运行信息（与 mobile 一致）
  const VEHICLE_INFO: Record<string, { speed: number; eta: string }> = {
    'YM202601100001': { speed: 78, eta: '今天 14:30 前送达' },
    'YM202601150001': { speed: 65, eta: '今天 16:00 前送达' }
  }

  const showMap = computed(() => {
    if (!detail.value) return false
    return ['transit', 'arrived', 'unloading', 'completed'].includes(detail.value.status)
  })

  const STEPS = [
    { key: 'pending',   label: '待发运' },
    { key: 'transit',   label: '在途' },
    { key: 'arrived',   label: '到库' },
    { key: 'unloading', label: '待接卸' },
    { key: 'completed', label: '已完成' }
  ]
  const STATUS_ORDER = ['pending', 'transit', 'arrived', 'unloading', 'completed']

  const progressSteps = computed(() => {
    if (!detail.value) return []
    const cur = STATUS_ORDER.indexOf(detail.value.status)
    return STEPS.map((s, idx) => ({ ...s, done: idx < cur, active: idx === cur }))
  })

  const reversedLogs = computed(() =>
    detail.value?.statusLogs ? [...detail.value.statusLogs].reverse() : []
  )

  const latestLog = computed(() => {
    if (!detail.value?.statusLogs?.length) return null
    return detail.value.statusLogs[detail.value.statusLogs.length - 1]
  })

  // 计算两点的方位角（北顺时针），供卡车 SVG 旋转
  const computeBearing = (from: [number, number], to: [number, number]) => {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    return (Math.atan2(dx, dy) * 180) / Math.PI
  }

  // 在路径数组里找到离 target 最近点的索引
  const findNearestIndex = (path: [number, number][], target: [number, number]) => {
    let minDist = Infinity
    let idx = 0
    for (let i = 0; i < path.length; i++) {
      const dx = path[i][0] - target[0]
      const dy = path[i][1] - target[1]
      const d = dx * dx + dy * dy
      if (d < minDist) { minDist = d; idx = i }
    }
    return idx
  }

  const truckSVG = () => `
    <svg viewBox="0 0 28 44" width="26" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="14" width="20" height="28" rx="2" fill="#1989fa" stroke="#0e6dd6" stroke-width="0.6"/>
      <line x1="4" y1="22" x2="24" y2="22" stroke="#0e6dd6" stroke-width="0.4" opacity="0.5"/>
      <line x1="4" y1="30" x2="24" y2="30" stroke="#0e6dd6" stroke-width="0.4" opacity="0.5"/>
      <line x1="4" y1="38" x2="24" y2="38" stroke="#0e6dd6" stroke-width="0.4" opacity="0.5"/>
      <rect x="6" y="2" width="16" height="13" rx="1.5" fill="#0e6dd6"/>
      <rect x="8" y="3" width="12" height="5" rx="1" fill="#cce6ff" opacity="0.85"/>
      <circle cx="9" cy="11" r="1" fill="#fff281"/>
      <circle cx="19" cy="11" r="1" fill="#fff281"/>
      <rect x="2" y="16" width="2.5" height="5" rx="0.5" fill="#1a1a1a"/>
      <rect x="2" y="34" width="2.5" height="5" rx="0.5" fill="#1a1a1a"/>
      <rect x="23.5" y="16" width="2.5" height="5" rx="0.5" fill="#1a1a1a"/>
      <rect x="23.5" y="34" width="2.5" height="5" rx="0.5" fill="#1a1a1a"/>
    </svg>
  `

  // 异步加载高德地图 JS（一次性）
  const loadAMap = (): Promise<any> => new Promise((resolve, reject) => {
    if (window.AMap?.Map) { resolve(window.AMap); return }
    if (window.AMap) delete window.AMap
    window._AMapSecurityConfig = { securityJsCode: import.meta.env.VITE_AMAP_SECRET }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${import.meta.env.VITE_AMAP_KEY}&plugin=AMap.Driving`
    script.onload = () => resolve(window.AMap)
    script.onerror = reject
    document.head.appendChild(script)
  })

  // 初始化地图：起点/终点气泡 + 路线（在途时双色 + 卡车）
  const initAMap = async () => {
    if (!detail.value || !mapRef.value) return
    const origin = LOCATION_MAP[detail.value.refineryName]
    const dest = LOCATION_MAP[detail.value.depotName]
    if (!origin || !dest) return

    await nextTick()
    const AMap = await loadAMap()
    if (amapInstance) { amapInstance.destroy(); amapInstance = null }

    amapInstance = new AMap.Map(mapRef.value, {
      zoom: 8,
      center: [(origin[0] + dest[0]) / 2, (origin[1] + dest[1]) / 2],
      resizeEnable: true,
      features: ['bg', 'road']
    })

    // 起点气泡
    amapInstance.add(new AMap.Marker({
      position: origin,
      content: `<div class="bubble-marker bubble-origin">
        <span class="bubble-tag">发</span>
        <span class="bubble-text">${detail.value.refineryName}</span>
      </div>`,
      offset: new AMap.Pixel(-16, -32)
    }))

    // 终点气泡
    amapInstance.add(new AMap.Marker({
      position: dest,
      content: `<div class="bubble-marker bubble-dest">
        <span class="bubble-tag">收</span>
        <span class="bubble-text">${detail.value.depotName}</span>
      </div>`,
      offset: new AMap.Pixel(-16, -32)
    }))

    // 驾车路线
    const vPos = VEHICLE_POS[detail.value.waybillNo]
    const isInTransit = detail.value.status === 'transit' && vPos

    AMap.plugin('AMap.Driving', () => {
      const driving = new AMap.Driving({ map: null, policy: 0 })
      driving.search(origin, dest, (status: string, result: any) => {
        if (status !== 'complete' || !result.routes?.[0]) return
        const fullPath: [number, number][] = []
        result.routes[0].steps.forEach((step: any) => {
          step.path.forEach((p: any) => fullPath.push([p.lng, p.lat]))
        })

        if (isInTransit) {
          const splitIdx = findNearestIndex(fullPath, vPos)
          const snappedPos = fullPath[splitIdx]
          const passedPath = fullPath.slice(0, splitIdx + 1)
          const remainingPath = fullPath.slice(splitIdx)

          new AMap.Polyline({ path: passedPath, strokeColor: '#c8c9cc', strokeWeight: 6, strokeOpacity: 0.9, map: amapInstance })
          new AMap.Polyline({ path: remainingPath, strokeColor: '#1989fa', strokeWeight: 6, strokeOpacity: 0.95, map: amapInstance })

          const next = fullPath[Math.min(splitIdx + 3, fullPath.length - 1)]
          const heading = computeBearing(snappedPos, next)
          addVehicleMarker(AMap, snappedPos, heading)
        } else {
          new AMap.Polyline({
            path: fullPath,
            strokeColor: detail.value!.status === 'completed' ? '#bbb' : '#1989fa',
            strokeWeight: 6,
            strokeOpacity: 0.9,
            map: amapInstance
          })
        }

        amapInstance.setFitView(amapInstance.getAllOverlays())
      })
    })
  }

  // 卡车 marker + 信息卡
  const addVehicleMarker = (AMap: any, pos: [number, number], heading: number) => {
    const info = VEHICLE_INFO[detail.value!.waybillNo] || { speed: 60, eta: '预计今日送达' }

    amapInstance.add(new AMap.Marker({
      position: pos,
      content: `<div class="truck-only" style="transform: rotate(${heading}deg);">${truckSVG()}</div>`,
      offset: new AMap.Pixel(-18, -22),
      zIndex: 200
    }))
    amapInstance.add(new AMap.Marker({
      position: pos,
      content: `<div class="truck-info-card">
        <div class="truck-info-row">
          <span class="truck-tag">运输中</span>
          <span class="truck-speed">${info.speed} km/h</span>
        </div>
        <div class="truck-eta">${info.eta}</div>
      </div>`,
      offset: new AMap.Pixel(-78, -68),
      zIndex: 201
    }))
  }

  const fetchDetail = async () => {
    if (!props.waybillId) return
    loading.value = true
    try {
      const { code, data } = await getWaybillDetail(props.waybillId)
      if (code === 200) {
        detail.value = data
        if (showMap.value) nextTick(initAMap)
      }
    } finally {
      loading.value = false
    }
  }

  // 抽屉关闭：销毁地图实例 + 清空详情
  const handleClosed = () => {
    if (amapInstance) { amapInstance.destroy(); amapInstance = null }
    detail.value = null
  }
</script>

<style lang="scss" scoped>
  .detail-scrollbar {
    height: 100%;
    background: #f5f5f5;
  }

  .detail-drawer {
    background: #f5f5f5;
    padding-bottom: 16px;
  }

  .drawer-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 16px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;

    .header-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .header-close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      cursor: pointer;
      color: #666;
      &:hover { background: #f5f5f5; color: #333; }
    }
  }

  /* 地图 */
  .map-wrapper { position: relative; width: 100%; height: 320px; }
  .map-container { width: 100%; height: 100%; }
  .map-container :deep(img) { filter: saturate(0.5) brightness(1.05); }

  .map-fade-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(to bottom, rgba(245,245,245,0) 0%, rgba(245,245,245,0.95) 100%);
    pointer-events: none;
    z-index: 999;
  }

  .map-overlay {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 998;
    pointer-events: none;
  }

  .map-status-badge {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 10px;
    font-weight: 600;
    color: #fff;
  }
  .status-transit  { background: rgba(25,137,250,0.9); }
  .status-arrived  { background: rgba(7,193,96,0.9); }
  .status-unloading{ background: rgba(114,50,221,0.9); }
  .status-pending  { background: rgba(255,174,31,0.9); }
  .status-completed{ background: rgba(7,193,96,0.9); }
  .status-cancelled{ background: rgba(153,153,153,0.9); }
  .status-draft    { background: rgba(153,153,153,0.9); }

  .map-plate {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    background: rgba(0,0,0,0.45);
    padding: 2px 8px;
    border-radius: 4px;
  }

  /* 进度卡 */
  .progress-card {
    margin: 12px 12px 0;
    background: #fff;
    border-radius: 14px;
    padding: 18px 8px 16px;
  }

  .progress-steps { display: flex; align-items: flex-start; margin-bottom: 14px; padding-bottom: 4px; }
  .progress-step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; min-width: 0; }
  .step-dot-wrap { position: relative; width: 100%; display: flex; align-items: center; justify-content: center; height: 22px; }

  .step-dot {
    width: 20px; height: 20px; border-radius: 50%;
    background: #fff; border: 1.5px solid #e0e0e0;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; z-index: 2; position: relative;
    transition: all 0.3s ease;
  }
  .step-dot.done {
    background: linear-gradient(135deg, #1989fa 0%, #4ba8ff 100%);
    border-color: #1989fa;
    box-shadow: 0 2px 6px rgba(25, 137, 250, 0.35);
  }
  .step-dot.active {
    background: #fff;
    border: 2.5px solid #1989fa;
    box-shadow: 0 0 0 4px rgba(25, 137, 250, 0.15);
  }
  .step-dot-pulse {
    width: 8px; height: 8px; border-radius: 50%;
    background: #1989fa;
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.7; }
  }

  .step-line {
    position: absolute;
    top: 50%;
    left: calc(50% + 12px);
    right: calc(-50% + 12px);
    height: 2px; z-index: 1;
    transform: translateY(-1px);
  }
  .line-done { background: linear-gradient(to right, #1989fa, #4ba8ff); border-radius: 1px; }
  .line-pending {
    background-image: linear-gradient(to right, #d8d8d8 0%, #d8d8d8 50%, transparent 50%);
    background-size: 7px 2px; background-repeat: repeat-x;
  }

  .step-label {
    font-size: 12px; color: #999;
    margin-top: 8px; text-align: center;
    white-space: nowrap; font-weight: 500;
    transition: color 0.3s;
  }
  .step-label.active { color: #1989fa; font-weight: 600; }
  .step-label.done-label { color: #555; }

  .latest-log {
    display: flex; align-items: flex-start; gap: 8px;
    padding-top: 12px; border-top: 1px solid #f5f5f5;
  }
  .latest-dot { width: 8px; height: 8px; border-radius: 50%; background: #1989fa; flex-shrink: 0; margin-top: 4px; }
  .latest-text { display: flex; flex-direction: column; gap: 2px; }
  .latest-remark { font-size: 13px; color: #333; font-weight: 500; }
  .latest-time { font-size: 12px; color: #999; }

  /* 信息卡 */
  .info-card { margin: 12px 12px 0; background: #fff; border-radius: 14px; padding: 16px; }
  .info-route { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .info-endpoint { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
  .info-endpoint-right { justify-content: flex-end; }

  .endpoint-tag { font-size: 11px; font-weight: 700; padding: 2px 5px; border-radius: 3px; flex-shrink: 0; }
  .endpoint-tag.origin { background: #e8f3ff; color: #1989fa; }
  .endpoint-tag.dest   { background: #fff0eb; color: #ff6b35; }

  .endpoint-name {
    font-size: 14px; font-weight: 700; color: #1a1a1a;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .route-arrow { width: 28px; height: 10px; flex-shrink: 0; }
  .info-divider { height: 1px; background: #f5f5f5; margin-bottom: 14px; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
  .info-item { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .info-item-full { grid-column: 1 / -1; }
  .info-label { font-size: 12px; color: #999; }
  .info-value { font-size: 14px; color: #333; font-weight: 500; word-break: break-all; }
  .info-value.highlight { color: #1989fa; font-weight: 600; }

  /* 物流动态 */
  .timeline-card { margin: 12px 12px 16px; background: #fff; border-radius: 14px; padding: 16px; }
  .timeline-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 14px; }
  .timeline-list { display: flex; flex-direction: column; }
  .timeline-item { display: flex; gap: 12px; }
  .timeline-dot-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }

  .timeline-dot { width: 10px; height: 10px; border-radius: 50%; background: #d0d0d0; flex-shrink: 0; margin-top: 3px; }
  .timeline-dot.active { background: #1989fa; box-shadow: 0 0 0 3px rgba(25,137,250,0.2); }

  .timeline-line { width: 1px; flex: 1; background: #f0f0f0; margin: 4px 0; min-height: 16px; }
  .timeline-content { padding-bottom: 16px; flex: 1; }
  .timeline-item:last-child .timeline-content { padding-bottom: 0; }

  .timeline-remark { font-size: 14px; color: #333; line-height: 1.5; }
  .timeline-item-active .timeline-remark { color: #1989fa; font-weight: 600; }
  .timeline-meta { display: flex; gap: 12px; font-size: 12px; color: #999; margin-top: 3px; flex-wrap: wrap; }

  .empty-logs { text-align: center; color: #999; font-size: 14px; padding: 16px 0; }
</style>

<style>
  /* 抽屉 body 内边距清零，把滚动交给内部 ElScrollbar，避免叠两层滚动条 */
  .waybill-detail-drawer .el-drawer__body {
    padding: 0;
    overflow: hidden;
  }

  /* 起终点气泡（与 mobile 保持一致） */
  .bubble-marker {
    display: inline-flex;
    align-items: center;
    background: #fff;
    padding: 3px 8px 3px 3px;
    border-radius: 14px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.16);
    white-space: nowrap;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
  }
  .bubble-marker::after {
    content: '';
    position: absolute;
    bottom: -4px; left: 14px;
    width: 0; height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 5px solid #fff;
    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.06));
  }
  .bubble-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px; height: 18px;
    border-radius: 50%;
    font-size: 10px; font-weight: 700;
    color: #fff;
    margin-right: 5px;
    flex-shrink: 0;
  }
  .bubble-origin .bubble-tag { background: #1989fa; }
  .bubble-dest .bubble-tag   { background: #ff6b35; }
  .bubble-text { font-size: 11px; font-weight: 600; color: #1a1a1a; letter-spacing: 0.2px; }

  /* 卡车信息卡 */
  .truck-info-card {
    background: #fff;
    border-radius: 8px;
    padding: 6px 10px;
    box-shadow: 0 3px 10px rgba(0,0,0,0.16);
    margin-bottom: 4px;
    min-width: 140px;
    position: relative;
  }
  .truck-info-card::after {
    content: '';
    position: absolute;
    bottom: -4px; left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid #fff;
  }
  .truck-info-row { display: flex; align-items: center; gap: 6px; margin-bottom: 1px; }
  .truck-tag {
    background: #1989fa; color: #fff;
    font-size: 10px; font-weight: 600;
    padding: 1px 6px; border-radius: 3px; letter-spacing: 0.2px;
  }
  .truck-speed { font-size: 12px; color: #1989fa; font-weight: 700; }
  .truck-eta { font-size: 11px; color: #666; white-space: nowrap; }

  /* 隐藏地图版权 */
  .amap-copyright, .amap-logo {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
</style>
