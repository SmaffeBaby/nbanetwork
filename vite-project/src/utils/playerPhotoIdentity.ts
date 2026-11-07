type PhotoPlayer = { PLAYER_ID: number; PLAYER_NAME: string }
const key = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const withoutSuffix = (name: string) => key(name.trim().replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, ''))

export function findPhotoPlayer(players: PhotoPlayer[], name: string): number | null {
  const exact = players.filter(player => key(player.PLAYER_NAME) === key(name))
  if (exact.length === 1) return exact[0]!.PLAYER_ID
  if (exact.length > 1) return null
  const matches = players.filter(player => withoutSuffix(player.PLAYER_NAME) === withoutSuffix(name))
  return matches.length === 1 ? matches[0]!.PLAYER_ID : null
}
