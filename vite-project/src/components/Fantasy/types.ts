export const slots = ['PG', 'SG', 'SF', 'PF', 'C'] as const
export type Slot = typeof slots[number]
export type Match = { id: string; start: string; matchup: string; completed?: boolean; teams?: { id: string; abbr: string; homeAway?: string }[] }
export type Player = { id: string; name: string; team: string; positions: string[]; injury: string; remaining: number; schedule: Match[] }
export type Pick = { id: string; name: string; team: string; slot: Slot }
export type Week = { id: string; start: string; end: string; next: string }
export type Entry = { user_id: string; week: string; ends_at: string; confirmed_at: string; lineup: Pick[]; points: number; player_games: number; rank: number; player_points: Record<string, number>; player_base_points?: Record<string, number>; player_bonus_points?: Record<string, number>; updated_at: string | null }
export type Leader = { user_id: string; first_name: string; last_name: string; points: number; rank: number; player_games?: number; weeks?: number }
export type Board = { week: Week; selectedWeek: string; leaderboard: Leader[]; overall: Leader[]; history: Entry[]; participants: number }
export const points = (n: number) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 1 })
export const dateTime = (date: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
export const weekLabel = (date: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`))

export type FantasyScore = { basePoints: number; bonusPoints: number; bonusRate: number; bonusLevel: number; points: number; profile: boolean; games: { id: string; start: string; matchup: string; points: number; breakdown: { key: string; label: string; count: number; weight: number; points: number }[] }[] }
export type PlayerDetails = { fantasy: FantasyScore; id: string; season: string; gamesPlayed: number; stats: Record<string, number>; ranks: Record<string, { place: number; total: number } | null>; rankingsUpdating: boolean; reboundsRankedAt: string | null; rankedAt: string; schedule: Match[] }
