import { teamsFullNames } from '../constants/TeamFullName'

export const getTeamFullName = (abbr: string): string => {
    return teamsFullNames[abbr] || abbr
}