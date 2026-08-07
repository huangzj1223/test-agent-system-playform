/**
 * 智能体展示模式 composable
 * 统一封装：模式切换（停靠/悬浮/全屏）、悬浮窗拖动与 8 向缩放、
 * 视口夹取与 resize 纠偏、拖拽过程 rAF 节流 + 结束落库。
 *
 * 设计要点：
 * - 拖拽/缩放过程只更新本地 ref（liveGeom），pointerup 才写回 store，避免高频持久化。
 * - 所有视口夹取集中在本文件（clampGeom），三处不各写一份。
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useAgentChatStore, type AgentMode } from '@/store/modules/agentChat'

/** 悬浮窗最小尺寸（与 store 兜底一致） */
const MIN_W = 360
const MIN_H = 480

/** 缩放方向：n/s/e/w 及四角组合 */
export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export function useAgentMode() {
  const store = useAgentChatStore()
  const { mode, floatingPosition, floatingSize } = storeToRefs(store)

  /** 拖拽/缩放期间的本地几何（渲染源），初始同步自 store */
  const liveGeom = ref({
    x: floatingPosition.value.x,
    y: floatingPosition.value.y,
    w: floatingSize.value.width,
    h: floatingSize.value.height
  })

  /** 视口尺寸兜底（无 window 时给桌面常见值，避免夹取为 0） */
  const viewport = () => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800
  })

  /** 夹取几何到视口内：尺寸不超视口且不低于最小值，位置不出界 */
  const clampGeom = (g: { x: number; y: number; w: number; h: number }) => {
    const vp = viewport()
    const w = Math.min(Math.max(g.w, MIN_W), vp.w)
    const h = Math.min(Math.max(g.h, MIN_H), vp.h)
    const x = Math.min(Math.max(g.x, 0), Math.max(0, vp.w - w))
    const y = Math.min(Math.max(g.y, 0), Math.max(0, vp.h - h))
    return { x, y, w, h }
  }

  /** 把本地几何落库（拖拽/缩放结束时调用） */
  const commitGeom = () => {
    const g = clampGeom(liveGeom.value)
    liveGeom.value = g
    store.setFloatingPosition({ x: g.x, y: g.y })
    store.setFloatingSize({ width: g.w, height: g.h })
  }

  /** 拖拽/缩放过程态 */
  let rafId = 0
  let dragStart: { px: number; py: number; g: typeof liveGeom.value } | null = null
  let resizeDir: ResizeDir | null = null

  /** rAF 节流：把一次几何计算合并到下一帧写入 liveGeom */
  const scheduleGeom = (next: typeof liveGeom.value) => {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      liveGeom.value = clampGeom(next)
    })
  }

  /** 开始拖动标题栏移动窗口 */
  const onDragStart = (e: PointerEvent) => {
    dragStart = { px: e.clientX, py: e.clientY, g: { ...liveGeom.value } }
    ;(e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId)
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', onDragEnd)
  }

  const onDragMove = (e: PointerEvent) => {
    if (!dragStart) return
    const dx = e.clientX - dragStart.px
    const dy = e.clientY - dragStart.py
    scheduleGeom({ ...liveGeom.value, x: dragStart.g.x + dx, y: dragStart.g.y + dy })
  }

  const onDragEnd = () => {
    dragStart = null
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    commitGeom()
  }

  /** 开始缩放（按方向） */
  const onResizeStart = (dir: ResizeDir, e: PointerEvent) => {
    e.stopPropagation()
    resizeDir = dir
    dragStart = { px: e.clientX, py: e.clientY, g: { ...liveGeom.value } }
    ;(e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId)
    window.addEventListener('pointermove', onResizeMove)
    window.addEventListener('pointerup', onResizeEnd)
  }

  const onResizeMove = (e: PointerEvent) => {
    if (!dragStart || !resizeDir) return
    const dx = e.clientX - dragStart.px
    const dy = e.clientY - dragStart.py
    const g = { ...dragStart.g }
    const d = resizeDir
    // 东/西边：改宽度；西边同时移动 x。南/北边：改高度；北边同时移动 y。
    if (d.includes('e')) g.w = dragStart.g.w + dx
    if (d.includes('w')) {
      g.w = dragStart.g.w - dx
      g.x = dragStart.g.x + dx
    }
    if (d.includes('s')) g.h = dragStart.g.h + dy
    if (d.includes('n')) {
      g.h = dragStart.g.h - dy
      g.y = dragStart.g.y + dy
    }
    // 触底最小尺寸时，避免西/北拖动把位置继续推移（否则窗口会“漂移”）
    if (g.w < MIN_W && d.includes('w')) g.x = dragStart.g.x + (dragStart.g.w - MIN_W)
    if (g.h < MIN_H && d.includes('n')) g.y = dragStart.g.y + (dragStart.g.h - MIN_H)
    scheduleGeom(g)
  }

  const onResizeEnd = () => {
    resizeDir = null
    dragStart = null
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', onResizeEnd)
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    commitGeom()
  }

  /** 上一个非全屏模式，供“退出全屏”回到停靠或悬浮 */
  const lastNonFullscreen = ref<AgentMode>(mode.value === 'fullscreen' ? 'docked' : mode.value)

  /** 切换模式：记录进入全屏前的模式，切换只改 store.mode（不碰会话） */
  const setMode = (m: AgentMode) => {
    if (m !== 'fullscreen') lastNonFullscreen.value = m
    // 进入悬浮态时，先把当前几何夹取进视口，避免持久化的旧坐标出界
    if (m === 'floating') {
      liveGeom.value = clampGeom({
        x: floatingPosition.value.x,
        y: floatingPosition.value.y,
        w: floatingSize.value.width,
        h: floatingSize.value.height
      })
      commitGeom()
    }
    store.setMode(m)
    store.setPanelOpen(true)
  }

  /** 退出全屏：回到进入前的模式 */
  const exitFullscreen = () => setMode(lastNonFullscreen.value)

  /** 是否移动端（悬浮态在小屏降级为抽屉，见外壳判断） */
  const isMobile = computed(() => store.isMobile)

  /** 悬浮窗内联样式（渲染用本地几何，保证拖拽跟手） */
  const floatingStyle = computed(() => ({
    left: `${liveGeom.value.x}px`,
    top: `${liveGeom.value.y}px`,
    width: `${liveGeom.value.w}px`,
    height: `${liveGeom.value.h}px`
  }))

  /** 视口变化时把悬浮几何纠偏回视口内 */
  const onViewportResize = () => {
    if (mode.value !== 'floating') return
    liveGeom.value = clampGeom(liveGeom.value)
    commitGeom()
  }

  onMounted(() => {
    window.addEventListener('resize', onViewportResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onViewportResize)
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', onResizeEnd)
    if (rafId) cancelAnimationFrame(rafId)
  })

  return {
    mode,
    isMobile,
    liveGeom,
    floatingStyle,
    lastNonFullscreen,
    setMode,
    exitFullscreen,
    onDragStart,
    onResizeStart
  }
}
