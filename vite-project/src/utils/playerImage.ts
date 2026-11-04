const placeholder = '/logos/logo-nba-mom.svg'

function seasonForDate(date: Date) {
    const year = date.getUTCFullYear() - (date.getUTCMonth() < 6 ? 1 : 0)
    return `${year}-${String(year + 1).slice(-2)}`
}

export function playerImageUrl(id: string | number, period?: string) {
    const season = period && /^\d{4}-\d{2}$/.test(period)
        ? period
        : seasonForDate(period && /^\d{4}-\d{2}-\d{2}$/.test(period) ? new Date(`${period}T12:00:00Z`) : new Date())
    return `/api/player-image/${encodeURIComponent(String(id))}/${season}`
}

export const getEspnPlayerImage = (id: string | number, period?: string) => playerImageUrl(`espn:${id}`, period)

export const getPlayerImage = (player: { PLAYER_ID?: string | number }, period?: string) =>
    player.PLAYER_ID ? playerImageUrl(player.PLAYER_ID, period) : placeholder

export function handleImageError(event: Event) {
    const image = event.target as HTMLImageElement
    if (image.getAttribute('src') !== placeholder) image.src = placeholder
}
