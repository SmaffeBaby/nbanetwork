import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

export function useSlider(length: number) {
    const currentSlide = ref(0)

    const nextIndex = computed(() =>
        (currentSlide.value + 1) % length
    )

    const next = () => {
        currentSlide.value =
            (currentSlide.value + 1) % length
    }

    const prev = () => {
        currentSlide.value =
            (currentSlide.value - 1 + length) % length
    }

    const goTo = (i: number) => {
        currentSlide.value = i
    }


    let interval: ReturnType<typeof setInterval> | null = null

    const start = () => {
        if (interval) return
        interval = setInterval(next, 10000)
    }

    const pause = () => {
        if (interval) {
            clearInterval(interval)
            interval = null
        }
    }

    onMounted(start)
    onBeforeUnmount(pause)


    let touchStartX = 0

    const onTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX
    }

    const onTouchEnd = (e: TouchEvent) => {
        const diff = e.changedTouches[0].clientX - touchStartX

        if (Math.abs(diff) > 50) {
            diff > 0 ? prev() : next()
        }
    }

    return {
        currentSlide,
        nextIndex,
        next,
        prev,
        goTo,
        start,
        pause,
        onTouchStart,
        onTouchEnd,
    }
}