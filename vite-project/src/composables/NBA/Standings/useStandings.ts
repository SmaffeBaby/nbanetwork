import { ref, onMounted } from 'vue'
import { teamsFullNames } from '../../../constants/TeamFullName.ts'

export function useStandings() {
    const teams = ref<any[]>([])
    const selectedSeason = ref('2025-26')
    const seasons = [
        '2025-26', '2024-25', '2023-24', '2022-23', '2021-22',
        '2020-21', '2019-20', '2018-19', '2017-18', '2016-17',
        '2015-16', '2014-15', '2013-14', '2012-13', '2011-12',
        '2010-11', '2009-10', '2008-09', '2007-08', '2006-07',
        '2005-06', '2004-05', '2003-04', '2002-03', '2001-02',
        '2000-01', '1999-00', '1998-99', '1997-98', '1996-97',
        '1995-96', '1994-95', '1993-94', '1992-93', '1991-92',
        '1990-91'
    ];

    const reverseMap = Object.fromEntries(
        Object.entries(teamsFullNames).map(([k, v]) => [v, k])
    )

    const getLogo = (team: any) => {
        if (team.TeamCity === 'LA' && team.TeamName === 'Clippers') {
            return '/logos/LAC.svg'
        }

        const abbr =
            team.TeamAbbreviation ||
            reverseMap[`${team.TeamCity} ${team.TeamName}`]

        return abbr ? `/logos/${abbr}.svg` : ''
    }

    const getTeams = (conf: string) =>
        teams.value.filter((t) => t.Conference === conf)

    const getField = (team: any, ...keys: string[]) => {
        for (const k of keys) {
            if (team[k] !== undefined && team[k] !== null) return team[k]
        }
        return '-'
    }

    const rowClass = (i: number) => {
        if (i === 5) return 'border-b-2 border-dashed border-gray-500'
        if (i === 9) return 'border-b-2 border-blue-500'
        return ''
    }

    const getStatus = (i: number) => {
        if (i < 6) return 'x'
        if (i < 10) return 'pi'
        return ''
    }

    const fetchStandings = async () => {
        try {
            const res = await fetch(`/api/standings/${selectedSeason.value}`)
            const data = await res.json()

            const rs = data.resultSet || data.resultSets?.[0]
            if (!rs) return

            teams.value = rs.rowSet.map((row: any[]) => {
                const obj: Record<string, any> = {}
                rs.headers.forEach((h: string, i: number) => {
                    obj[h] = row[i]
                })
                return obj
            })
        } catch (err) {
            console.error('Error fetching standings:', err)
        }
    }

    onMounted(() => {
        fetchStandings()
        setInterval(fetchStandings, 60000)
    })

    return {
        teams,
        selectedSeason,
        seasons,
        getLogo,
        getTeams,
        getField,
        rowClass,
        getStatus,
        fetchStandings,
    }
}