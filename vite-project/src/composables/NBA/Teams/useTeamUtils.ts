import { teamsFullNames } from '../../../constants/TeamFullName'
import { teamStyles } from '../../../constants/TeamColorsAndBackground'

export const getTeamAbbr = (team: any): string => {
    if (team.TeamAbbreviation) return team.TeamAbbreviation

    if (Array.isArray(team)) {
        const fullName = `${team[3]} ${team[4]}`
        return Object.keys(teamsFullNames).find(k => teamsFullNames[k] === fullName) || ''
    }

    if (team.TeamCity && team.TeamName) {
        const fullName = `${team.TeamCity} ${team.TeamName}`
        return Object.keys(teamsFullNames).find(k => teamsFullNames[k] === fullName) || ''
    }

    return ''
}

export const getTeamStyle = (team: any) => {
    const abbr = getTeamAbbr(team)
    return teamStyles[abbr] || { bgColorHex: '#1F2937', bgSvg: '' }
}