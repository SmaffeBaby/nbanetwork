export const getPlayerImage = (player: any) => {
    return `/api/player-image/${player.PLAYER_ID}`
}
export const handleImageError = (e: any) => {
    const playerId = e.target.dataset.playerId

    e.target.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
}