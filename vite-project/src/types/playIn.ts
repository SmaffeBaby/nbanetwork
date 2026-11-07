import type { GameCompetition } from './gameCompetition'

export type PlayInTeam = { abbr: string; name: string; score: number | null }
export type PlayInGame = {
  id: string
  date: string
  conference: 'east' | 'west'
  stage: 'seventh' | 'elimination' | 'eighth'
  status: 'Final' | 'Live' | 'Scheduled'
  completed: boolean
  competition: GameCompetition
  home: PlayInTeam
  away: PlayInTeam
}
export type PlayInData = { year: number; games: PlayInGame[]; complete: boolean; updatedAt: string }
