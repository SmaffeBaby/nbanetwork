export const getPlayerImage = (player: any) => {
    const id = String(player.PLAYER_ID || '')
    if (/^espn:\d+$/.test(id)) return `https://a.espncdn.com/i/headshots/nba/players/full/${id.slice(5)}.png`
    return `/api/player-image/${id}`
}
export const handleImageError = (e: any) => {
    const playerId = e.target.dataset.playerId

    if (String(playerId).startsWith('espn:')) { e.target.onerror = null; e.target.src = '/logos/logo-nba-mom.svg'; return }
    e.target.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
}