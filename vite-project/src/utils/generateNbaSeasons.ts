export function generateNbaSeasons(
    startYear: number = 2000,
    endYear: number = new Date().getFullYear()
): string[] {
    const seasons: string[] = []

    for (let year = endYear; year >= startYear; year--) {
        const nextYear = year + 1

        const season = `${year}-${String(nextYear).slice(-2)}`

        seasons.push(season)
    }

    return seasons
}