import { computed, ref } from 'vue'
import axios from 'axios'

export type CareerTeam = {
    team: string
    startSeason: string
    endSeason: string
    startYear: number
    endYear: number
}

export type CareerResultSet = { name: string; headers: string[]; rowSet: (string | number | null)[][] }

export type CareerPlayer = {
    PLAYER_ID: number
    PLAYER_NAME: string
    TEAM_ABBREVIATION: string
}

export function usePlayerCareer() {
    const careerPlayer = ref<CareerPlayer | null>(null)
    const careerSeasons = ref<string[]>([])
    const careerTeams = ref<CareerTeam[]>([])
    const resultSets = ref<CareerResultSet[]>([])
    const loadingCareer = ref(false)

    const latestSeason = computed(() => careerSeasons.value[0] ?? '')

    let requestId = 0
    const fetchPlayerCareer = async (playerName: string) => {
        const id = ++requestId
        loadingCareer.value = true
        careerPlayer.value = null
        careerSeasons.value = []
        careerTeams.value = []
        resultSets.value = []

        try {
            const res = await axios.get(`/api/player-career/${encodeURIComponent(playerName)}`)

            if (id !== requestId) return
            if (res.data?.error) {
                careerPlayer.value = null
                careerSeasons.value = []
                careerTeams.value = []
                return
            }

            careerPlayer.value = res.data.player ?? null
            careerSeasons.value = res.data.seasons ?? []
            careerTeams.value = res.data.careerTeams ?? []
            resultSets.value = res.data.resultSets ?? []
        } catch (err) {
            if (id !== requestId) return
            console.error('Failed to fetch player career', err)
            careerPlayer.value = null
            careerSeasons.value = []
            careerTeams.value = []
        } finally {
            if (id === requestId) loadingCareer.value = false
        }
    }

    return {
        careerPlayer,
        careerSeasons,
        careerTeams,
        latestSeason,
        resultSets,
        loadingCareer,
        fetchPlayerCareer,
    }
}
