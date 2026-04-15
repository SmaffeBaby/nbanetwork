import { computed, onMounted } from 'vue'
import { useMapStore } from '../../../stores/mapStore'

export const useMap = () => {
    const store = useMapStore()

    const teams = computed(() => store.teams)
    const isAdmin = computed(() => store.isAdmin)

    onMounted(() => {
        store.fetchTeams()
        store.checkAdmin()
    })

    return {
        teams,
        isAdmin,

        addTeam: store.addTeam,
        updateTeam: store.updateTeam,
        deleteTeam: store.deleteTeam
    }
}