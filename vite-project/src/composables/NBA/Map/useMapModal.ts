import { ref } from 'vue'

export const useMapModal = () => {
    const showModal = ref(false)
    const selectedPoint = ref<any>(null)
    const selectedLogo = ref('')
    const newLink = ref('')

    const openCreate = (coords: { x: number; y: number }) => {
        selectedPoint.value = null
        showModal.value = true
        return coords
    }

    const openEdit = (team: any) => {
        selectedPoint.value = team
        selectedLogo.value = team.logo
        newLink.value = team.link
        showModal.value = true
    }

    const reset = () => {
        showModal.value = false
        selectedPoint.value = null
        selectedLogo.value = ''
        newLink.value = ''
    }

    return {
        showModal,
        selectedPoint,
        selectedLogo,
        newLink,
        openCreate,
        openEdit,
        reset
    }
}