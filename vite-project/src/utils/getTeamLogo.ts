export const getTeamLogo = (abbr: string): string => {
    if (!abbr) return '/logos/logo-nba.svg'

    return `/logos/${abbr}.svg`
}