import { type Entry, type Pick, slots } from './types'

// Derive from saved weekly results, so revisiting a profile never awards XP twice.
export function playerProgress(history: Entry[]) {
  const totals: Record<string, number> = {}
  const positions = new Map<string, { player: Pick; points: number }>()
  for (const entry of [...history].sort((a, b) => a.week.localeCompare(b.week))) {
    for (const player of entry.lineup) {
      const earned = Number(entry.player_points?.[player.id] || 0)
      const base = Number(entry.player_base_points?.[player.id] ?? earned)
      totals[player.id] = Math.round(((totals[player.id] || 0) + Math.max(0, base)) * 10) / 10
      const key = `${player.slot}:${player.id}`
      positions.set(key, { player, points: Math.round(((positions.get(key)?.points || 0) + earned) * 10) / 10 })
    }
  }
  return { totals, best: slots.map(slot => ({ slot, leader: [...positions.values()].filter(p => p.player.slot === slot).sort((a, b) => b.points - a.points || a.player.id.localeCompare(b.player.id))[0] })) }
}

export const playerBonusRate = (level: number) => level >= 10 ? 2 : level >= 8 ? 1.5 : level >= 5 ? 1 : level >= 3 ? 0.5 : 0
