export type DraftTeam = { abbr: string; name: string; localLogo: boolean }
export type DraftPick = {
  round: number
  overall: number
  pick: number
  selectedBy: DraftTeam | null
  owner: DraftTeam | null
  traded: boolean
  tradeNote: string | null
  player: { name: string; photoId: string | null; position: string | null; school: string | null } | null
}
export type DraftData = { year: number; completed: boolean; picks: DraftPick[]; updatedAt: string }
