import { getTeamLogo } from '../../../utils/getTeamLogo'

type Conference = 'East' | 'West'

const TEAM_ABBREVIATIONS: Record<string, string> = {
    ATL: 'ATL',
    Hawks: 'ATL',
    BOS: 'BOS',
    Celtics: 'BOS',
    BKN: 'BKN',
    Nets: 'BKN',
    CHA: 'CHA',
    Hornets: 'CHA',
    CHI: 'CHI',
    Bulls: 'CHI',
    CLE: 'CLE',
    Cavaliers: 'CLE',
    DAL: 'DAL',
    Mavericks: 'DAL',
    DEN: 'DEN',
    Nuggets: 'DEN',
    DET: 'DET',
    Pistons: 'DET',
    GSW: 'GSW',
    Warriors: 'GSW',
    HOU: 'HOU',
    Rockets: 'HOU',
    IND: 'IND',
    Pacers: 'IND',
    LAC: 'LAC',
    Clippers: 'LAC',
    LAL: 'LAL',
    Lakers: 'LAL',
    MEM: 'MEM',
    Grizzlies: 'MEM',
    MIA: 'MIA',
    Heat: 'MIA',
    MIL: 'MIL',
    Bucks: 'MIL',
    MIN: 'MIN',
    Timberwolves: 'MIN',
    NOP: 'NOP',
    Pelicans: 'NOP',
    NYK: 'NYK',
    Knicks: 'NYK',
    OKC: 'OKC',
    Thunder: 'OKC',
    ORL: 'ORL',
    Magic: 'ORL',
    PHI: 'PHI',
    '76ers': 'PHI',
    PHX: 'PHX',
    Suns: 'PHX',
    POR: 'POR',
    'Trail Blazers': 'POR',
    SAC: 'SAC',
    Kings: 'SAC',
    SAS: 'SAS',
    Spurs: 'SAS',
    TOR: 'TOR',
    Raptors: 'TOR',
    UTA: 'UTA',
    Jazz: 'UTA',
    WAS: 'WAS',
    Wizards: 'WAS'
}

const TEAM_CONFERENCES: Record<string, Conference> = {
    ATL: 'East',
    BOS: 'East',
    BKN: 'East',
    CHA: 'East',
    CHI: 'East',
    CLE: 'East',
    DET: 'East',
    IND: 'East',
    MIA: 'East',
    MIL: 'East',
    NYK: 'East',
    ORL: 'East',
    PHI: 'East',
    TOR: 'East',
    WAS: 'East',
    DAL: 'West',
    DEN: 'West',
    GSW: 'West',
    HOU: 'West',
    LAC: 'West',
    LAL: 'West',
    MEM: 'West',
    MIN: 'West',
    NOP: 'West',
    OKC: 'West',
    PHX: 'West',
    POR: 'West',
    SAC: 'West',
    SAS: 'West',
    UTA: 'West'
}

export function usePlayoffTeams(formatTeam: (team: string) => string) {
    function getTeamAbbr(team: string) {
        return TEAM_ABBREVIATIONS[formatTeam(team)] || TEAM_ABBREVIATIONS[team] || team
    }

    function getLogo(team: string) {
        return getTeamLogo(getTeamAbbr(team))
    }

    function getTeamConference(team: string): Conference {
        return TEAM_CONFERENCES[getTeamAbbr(team)] || 'East'
    }

    return {
        getTeamAbbr,
        getLogo,
        getTeamConference
    }
}
