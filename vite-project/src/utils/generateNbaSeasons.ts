/** The application rolls over seasons in October, consistently in Moscow time. */
export function getCurrentNbaSeason(date: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Moscow', year: 'numeric', month: 'numeric'
    }).formatToParts(date)
    const year = Number(parts.find(part => part.type === 'year')?.value)
    const month = Number(parts.find(part => part.type === 'month')?.value)
    const start = month >= 10 ? year : year - 1
    return `${start}-${String(start + 1).slice(-2)}`
}

export function generateNbaSeasons(
    startYear: number = 2000,
    endSeason: number | string = getCurrentNbaSeason()
): string[] {
    const endYear = typeof endSeason === 'string' ? Number(endSeason.split('-')[0]) : endSeason
    return Array.from({ length: Math.max(0, endYear - startYear + 1) }, (_, index) => {
        const year = endYear - index
        return `${year}-${String(year + 1).slice(-2)}`
    })
}
