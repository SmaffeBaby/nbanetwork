import type { CareerResultSet } from '../../../../composables/NBA/player_stats/usePlayerCareer'
import type { Pick, PlayerStatData } from '../../../Fantasy/types'

export type PlayerDraft = { status: 'drafted'; year: number; round: number; overall: number } | { status: 'undrafted' }
export type ProfileSeason = { season: PlayerStatData | null; bio: { birthDate?: string; country?: string; position?: string; draft?: PlayerDraft | null; active?: boolean | null; deathDate?: string | null; careerEndDate?: string | null } | null }
export type ComparePlayer = { id: string; name: string; team: string; position?: string; ovr: number; stats: Record<string,number> }
export type ProfileCurrent = { player?: PickedStats; position: string | null; fantasy: Pick | null; peers: ComparePlayer[]; candidates?: ComparePlayer[] }
type PickedStats = { name: string; stats: Record<string,number> }
export type ProfileGame = { id: string; date: string; opponent: string; stage: 'regular' | 'playoffs'; win: boolean; season: string; points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number }
export type ProfileGames = { best: ProfileGame[]; opponents: { team: string; games: number; wins: number; points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number }[]; unavailable: string[]; games: number }

export const positionNames: Record<string,string> = {Guard:'Защитник',Forward:'Форвард',Center:'Центровой','Guard-Forward':'Защитник / форвард','Forward-Center':'Форвард / центровой',PG:'Разыгрывающий',SG:'Атакующий защитник',G:'Защитник',SF:'Лёгкий форвард',PF:'Тяжёлый форвард',F:'Форвард',C:'Центровой','F-C':'Форвард / центровой','G-F':'Защитник / форвард'}

export function resultRows(sets: CareerResultSet[], name: string) {
  const set = sets.find(item => item.name === name)
  return set?.rowSet.map(row => Object.fromEntries(set.headers.map((key,i) => [key,row[i]]))) || []
}

export function summaryFromTotals(rows: ReturnType<typeof resultRows>): PlayerStatData | null {
  const sum = (key: string) => {
    const values = rows.map(row => row[key])
    return values.every(value => typeof value === 'number') ? values.reduce<number>((total,value) => total+Number(value),0) : undefined
  }
  const games = sum('GP') || 0
  if (!games) return null
  const stats: Record<string,number> = {gamesPlayed:games}
  for (const [key, field] of Object.entries({ avgPoints:'PTS',avgRebounds:'REB',avgOffensiveRebounds:'OREB',
    avgDefensiveRebounds:'DREB',avgAssists:'AST',avgSteals:'STL',avgBlocks:'BLK',avgTurnovers:'TOV',avgMinutes:'MIN' })) {
    const total = sum(field)
    if (total !== undefined) stats[key] = total/games
  }
  for (const [prefix,pct,made,attempts] of [
    ['TwoPoint','twoPointPct', (sum('FGM') ?? NaN)-(sum('FG3M') ?? NaN), (sum('FGA') ?? NaN)-(sum('FG3A') ?? NaN)],
    ['ThreePoint','threePointFieldGoalPct',sum('FG3M'),sum('FG3A')],
    ['FreeThrow','freeThrowPct',sum('FTM'),sum('FTA')]
  ] as const) {
    const name = prefix === 'FreeThrow' ? prefix : prefix+'FieldGoal'
    if (made !== undefined && Number.isFinite(made)) stats[`avg${name}sMade`] = made/games
    if (attempts !== undefined && Number.isFinite(attempts)) stats[`avg${name}sAttempted`] = attempts/games
    if (made !== undefined && Number.isFinite(made) && attempts && attempts>0) stats[pct] = 100*made/attempts
  }
  return {stats}
}
