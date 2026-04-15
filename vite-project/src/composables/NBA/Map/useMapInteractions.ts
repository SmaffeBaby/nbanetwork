import { ref, computed } from 'vue'

export const useMapInteractions = () => {
    const mapRef = ref<HTMLImageElement | null>(null)

    const scale = ref(1)
    const offsetX = ref(0)
    const offsetY = ref(0)

    const dragging = ref(false)
    const moved = ref(false)
    const startX = ref(0)
    const startY = ref(0)

    const clickX = ref(0)
    const clickY = ref(0)

    const transformStyle = computed(() => ({
        transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
        transformOrigin: 'top left'
    }))

    const startDrag = (e: MouseEvent) => {
        dragging.value = true
        moved.value = false
        startX.value = e.clientX - offsetX.value
        startY.value = e.clientY - offsetY.value
    }

    const onDrag = (e: MouseEvent) => {
        if (!dragging.value) return
        moved.value = true
        offsetX.value = e.clientX - startX.value
        offsetY.value = e.clientY - startY.value
    }

    const endDrag = () => {
        setTimeout(() => {
            dragging.value = false
            moved.value = false
        }, 50)
    }

    const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        scale.value += e.deltaY * -0.001
        scale.value = Math.min(Math.max(0.5, scale.value), 3)
    }

    const getClickCoords = (e: MouseEvent) => {
        if (!mapRef.value) return null

        const rect = mapRef.value.getBoundingClientRect()

        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        }
    }

    return {
        mapRef,
        transformStyle,
        startDrag,
        onDrag,
        endDrag,
        onWheel,
        getClickCoords,
        moved,
        clickX,
        clickY
    }
}