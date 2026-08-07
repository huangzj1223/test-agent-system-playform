/**
 * 聊天自动滚动 composable
 * 规则：用户处于底部时流式内容自动跟随；用户上滑查看历史时不强制拉回，
 * 并暴露 showBackToBottom 供“回到底部”按钮使用。
 */
import { ref, onMounted, onUnmounted, nextTick, type Ref } from 'vue'

/** 距底部多少像素内视为“在底部” */
const BOTTOM_THRESHOLD = 60

/**
 * @param scrollEl 滚动容器 ref
 */
export function useChatAutoScroll(scrollEl: Ref<HTMLElement | undefined>) {
  /** 是否自动跟随底部 */
  const following = ref(true)
  /** 是否显示“回到底部”按钮 */
  const showBackToBottom = ref(false)

  /** 判断是否接近底部 */
  const isNearBottom = (el: HTMLElement): boolean =>
    el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD

  /** 滚动到底部 */
  const scrollToBottom = (smooth = false) => {
    const el = scrollEl.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    following.value = true
    showBackToBottom.value = false
  }

  /** 内容增长时调用：仅在跟随态下滚动到底部 */
  const onContentGrow = async () => {
    if (!following.value) return
    await nextTick()
    scrollToBottom(false)
  }

  /** 滚动事件：更新跟随态与按钮显隐 */
  const onScroll = () => {
    const el = scrollEl.value
    if (!el) return
    const near = isNearBottom(el)
    following.value = near
    showBackToBottom.value = !near
  }

  onMounted(() => {
    scrollEl.value?.addEventListener('scroll', onScroll, { passive: true })
  })
  onUnmounted(() => {
    scrollEl.value?.removeEventListener('scroll', onScroll)
  })

  return { following, showBackToBottom, scrollToBottom, onContentGrow }
}
