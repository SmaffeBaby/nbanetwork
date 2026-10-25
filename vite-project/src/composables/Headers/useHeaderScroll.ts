import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export function useHeaderScroll() {
    const route = useRoute()
    const headerRef = ref<HTMLElement | null>(null)
    const hidden = ref(false)
    let lastY = 0
    let travel = 0
    let direction = 0
    let frame = 0

    const reset = () => {
        hidden.value = false
        travel = 0
        direction = 0
        lastY = Math.max(0, window.scrollY)
    }
    const update = () => {
        frame = 0
        const y = Math.max(0, window.scrollY)
        const delta = y - lastY
        lastY = y
        if (window.innerWidth < 1180 || y < 96 || headerRef.value?.contains(document.activeElement)) {
            hidden.value = false
            travel = 0
            return
        }
        const nextDirection = Math.sign(delta)
        if (!nextDirection) return
        if (direction !== nextDirection) travel = 0
        direction = nextDirection
        travel += Math.abs(delta)
        if (travel >= (direction > 0 ? 16 : 8)) {
            hidden.value = direction > 0
            travel = 0
        }
    }
    const onScroll = () => {
        if (!frame) frame = window.requestAnimationFrame(update)
    }
    const show = () => { hidden.value = false }
    watch(() => route.fullPath, reset)
    onMounted(() => {
        reset()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', reset)
    })
    onUnmounted(() => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', reset)
        if (frame) window.cancelAnimationFrame(frame)
    })
    return { headerRef, headerHidden: hidden, showHeader: show }
}
