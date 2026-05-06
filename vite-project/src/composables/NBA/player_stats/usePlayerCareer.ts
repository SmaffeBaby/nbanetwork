import { computed, ref } from 'vue'
import axios from 'axios'

export type CareerTeam = {
    team: string
    startSeason: string
    endSeason: string
    startYear: number
    endYear: number
}

export type CareerPlayer = {
    PLAYER_ID: number
    PLAYER_NAME: string
    TEAM_ABBREVIATION: string
}

export function usePlayerCareer() {
    const careerPlayer = ref<CareerPlayer | null>(null)
    const careerSeasons = ref<string[]>([])
    const careerTeams = ref<CareerTeam[]>([])
    const loadingCareer = ref(false)

    const latestSeason = computed(() => careerSeasons.value[0] ?? '')

    const fetchPlayerCareer = async (playerName: string) => {
        loadingCareer.value = true

        try {
            const res = await axios.get(`/api/player-career/${encodeURIComponent(playerName)}`)

            if (res.data?.error) {
                careerPlayer.value = null
                careerSeasons.value = []
                careerTeams.value = []
                return
            }

            careerPlayer.value = res.data.player ?? null
            careerSeasons.value = res.data.seasons ?? []
            careerTeams.value = res.data.careerTeams ?? []
        } catch (err) {
            console.error('Failed to fetch player career', err)
            careerPlayer.value = null
            careerSeasons.value = []
            careerTeams.value = []
        } finally {
            loadingCareer.value = false
        }
    }

    return {
        careerPlayer,
        careerSeasons,
        careerTeams,
        latestSeason,
        loadingCareer,
        fetchPlayerCareer,
    }
}
