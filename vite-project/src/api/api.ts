import axios from 'axios'
import type {GameCompetition} from '../types/gameCompetition'

export type Team = {
    id: number
    abbreviation: string
    full_name: string
}

export type Game = {
    competition?:GameCompetition|null
    id: number | string
    home_team: Team
    visitor_team: Team
    home_team_score: number
    visitor_team_score: number
    status: string
    period: number
    datetime: string
}

export const fetchGames = async (date?: string): Promise<{ data: Game[] }> => {
    const queryDate = date || new Date().toISOString().slice(0, 10)
    const res = await axios.get<{ data: Game[] }>(`/api/games?dates[]=${encodeURIComponent(queryDate)}`)
    return res.data
}

export const fetchStats = async (gameId: number) => {
    const res = await axios.get(`/api/stats?game_ids[]=${gameId}`)
    return res.data
}