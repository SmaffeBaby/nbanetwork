export function generateNbaSeasons(
    startYear: number = 2000,
    endSeason: number | string = new Date().getFullYear()
): string[] {
    const seasons: string[] = []
    const endYear =
        typeof endSeason === 'string'
            ? Number(endSeason.split('-')[0])
            : endSeason

    for (let year = endYear; year >= startYear; year--) {
        const nextYear = year + 1

        const season = `${year}-${String(nextYear).slice(-2)}`

        seasons.push(season)
    }

    return seasons
}
