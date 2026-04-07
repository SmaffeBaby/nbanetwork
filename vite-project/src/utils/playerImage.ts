export const getPlayerImage = (player: any) => {
    return `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/${player.TEAM_ID}/2025/260x190/${player.PLAYER_ID}.png`
}

export const handleImageError = (e: any) => {
    const playerId = e.target.dataset.playerId

    e.target.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
}