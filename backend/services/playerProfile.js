const axios = require('axios')
const cache = require('../utils/fetchWithCache')
const { seasonAthletes } = require('./gamePreview')
const { seasonPlayerStats, normalizeRow } = require('./fantasy/seasonStats')
const { seasonRatings, seasonYear } = require('./fantasy/ratings')
const { positions } = require('./fantasy/rules')
const TEAM_MAP = require('../constants/teamMap')

const PYTHON = process.env.PYTHON_API || 'http://python-backend:8000'
const ESPN = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes'
const CORE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes'
const aliases = { GS:'GSW', NY:'NYK', NO:'NOP', SA:'SAS', UTAH:'UTA', WSH:'WAS', NJ:'BKN', NJN:'BKN', SEA:'OKC', VAN:'MEM', NOH:'NOP', NOK:'NOP', CHH:'CHA', CHO:'CHA', BRK:'BKN', PHO:'PHX' }
const canonical = abbr => aliases[abbr] || abbr
const nbaTeams = new Set(Object.values(TEAM_MAP).map(team=>team.abbr))
const nameKey = name => name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const league = year => seasonAthletes(year,2)
const currentYear = () => seasonYear(new Date().toISOString().slice(0,10))
const yearOf = season => Number(season.slice(0,4))+1

function findAthlete(data, name) {
    const matches = data?.athletes.filter(row => [row.athlete.displayName,row.athlete.fullName].some(value => value && nameKey(value) === nameKey(name))) || []
    return matches.length === 1 ? matches[0].athlete : null
}

function biography(id) {
    return cache({ key:`player-bio:${id}`,ttl:86400000,fetcher:async () => {
        const {data} = await axios.get(`${CORE}/${id}`,{timeout:8000})
        return {birthDate:data.dateOfBirth || null,country:data.birthPlace?.country || null,position:data.position?.abbreviation || null}
    } })
}

function nbaBiography(id) {
    return cache({key:`nba-player-bio:${id}`,ttl:86400000,fetcher:async()=>{
        const {data} = await axios.get(`${PYTHON}/player-bio/${id}`,{timeout:12000})
        return data
    }})
}

async function overview(career, season) {
    const year = yearOf(season)
    const data = await league(year).catch(()=>null)
    const name = career.player.PLAYER_NAME
    const player = findAthlete(data,name)
    const latest = career.seasons[0]
    const identity = player || (latest && latest!==season ? findAthlete(await league(yearOf(latest)).catch(()=>null),name) : null)
    const [stats,bio] = await Promise.all([
        player ? cache({key:`profile-season:${year}:${player.id}`,ttl:5*60000,fetcher:()=>seasonPlayerStats(data,String(player.id),year)}).catch(()=>null) : null,
        identity ? biography(identity.id).catch(()=>null) : nbaBiography(career.player.PLAYER_ID).catch(()=>null)
    ])
    return {season:stats,bio:bio || (identity ? {position:identity.position?.abbreviation || null} : null)}
}

async function current(career) {
    const year = currentYear()
    const data = await league(year)
    const athlete = findAthlete(data,career.player.PLAYER_NAME)
    if (!athlete) return {fantasy:null,peers:[],position:null}
    const ratings = await seasonRatings(year)
    const role = athlete.position?.abbreviation
    const slot = positions(role)[0]
    const id = String(athlete.id)
    const candidates = data.athletes
        .filter(row => String(row.athlete.id)!==id && ratings[row.athlete.id]?.gamesPlayed>0)
        .map(row => ({id:String(row.athlete.id),name:row.athlete.displayName,team:canonical(row.athlete.teamShortName),
            position:row.athlete.position?.abbreviation,stats:normalizeRow(row,data.categories).stats,ovr:ratings[row.athlete.id].ovr}))
        .sort((a,b)=>b.ovr-a.ovr || b.stats.avgPoints-a.stats.avgPoints || a.name.localeCompare(b.name))
    const peers = candidates.filter(player=>role && player.position===role).slice(0,3)
    return {
        position:role || null,
        player:{name:athlete.displayName,stats:normalizeRow(data.athletes.find(row=>String(row.athlete.id)===id),data.categories).stats},
        peers,candidates,
        fantasy: slot ? {id,name:athlete.displayName,team:canonical(athlete.teamShortName)||career.player.TEAM_ABBREVIATION,slot,...ratings[id]} : null
    }
}

const metrics = {points:'points',rebounds:'totalRebounds',assists:'assists',steals:'steals',blocks:'blocks',turnovers:'turnovers'}
function espnGames(data, year) {
    if (Number(data.filters?.find(filter=>filter.name==='season')?.value)!==year || !Array.isArray(data.seasonTypes)) throw new Error('Unexpected game log season')
    const names = data.names || []
    const indices = Object.fromEntries(Object.entries(metrics).map(([key,name])=>[key,names.indexOf(name)]))
    return data.seasonTypes.flatMap(type => {
        const stage = /Regular Season/i.test(type.displayName) ? 'regular' : /Postseason|Playoffs/i.test(type.displayName) ? 'playoffs' : null
        if (!stage) return []
        return type.categories.flatMap(category => (category.events || []).flatMap(row => {
            const event = data.events?.[row.eventId]
            const opponent = canonical(event?.opponent?.abbreviation)
            // ESPN includes All-Star exhibitions in the regular-season log.
            if (!nbaTeams.has(opponent) || !event.gameDate || !Array.isArray(row.stats)) return []
            const stats = Object.fromEntries(Object.entries(indices).map(([key,index])=>[key,Number(row.stats[index])]))
            if (Object.values(stats).some(value=>!Number.isFinite(value))) return []
            return [{id:`espn:${row.eventId}`,date:event.gameDate,status:'Final',opponent,stage,win:event.gameResult==='W',...stats}]
        }))
    })
}

async function nbaGames(id, season) {
    const {data} = await axios.get(`${PYTHON}/player-gamelog/${id}/${season}`,{timeout:18000})
    const set = data.resultSets?.[0]
    if (!set) throw new Error('NBA game log unavailable')
    return set.rowSet.flatMap(row => {
        const g = Object.fromEntries(set.headers.map((key,i)=>[key,row[i]]))
        const opponent = g.MATCHUP?.match(/(?: @ | vs\. )([A-Z]{2,4})$/)?.[1]
        const date = new Date(g.GAME_DATE)
        if (!opponent || !Number.isFinite(+date) || !g.Game_ID && !g.GAME_ID) return []
        return [{id:String(g.Game_ID || g.GAME_ID),date:date.toISOString(),opponent:canonical(opponent),
            MATCHUP:g.MATCHUP,GAME_DATE:g.GAME_DATE,status:'Final',stage:g.SEASON_TYPE==='Playoffs'?'playoffs':'regular',win:g.WL==='W',
            points:g.PTS,rebounds:g.REB,assists:g.AST,steals:g.STL,blocks:g.BLK,turnovers:g.TOV}]
    })
}

async function gameLog(career, season, espnId) {
    const year = yearOf(season)
    return cache({key:`profile-log:${career.player.PLAYER_ID}:${season}`,ttl:year<currentYear()?86400000:5*60000,fetcher:async()=>{
        if (espnId) {
            try {
                const {data} = await axios.get(`${ESPN}/${espnId}/gamelog`,{params:{season:year},timeout:9000})
                const games = espnGames(data,year)
                if (games.length) return games
            } catch { /* Older seasons may only be available from NBA. */ }
        }
        return nbaGames(career.player.PLAYER_ID,season)
    }})
}

function totalsBySeason(career, key) {
    const set = career.resultSets?.find(item=>item.name===key)
    const totals = new Map()
    if (!set) return totals
    const season = set.headers.indexOf('SEASON_ID')
    const team = set.headers.indexOf('TEAM_ID')
    const games = set.headers.indexOf('GP')
    const combined = new Set()
    for (const row of set.rowSet) {
        const id = row[season], count = Number(row[games]) || 0
        if (Number(row[team])===0) {
            totals.set(id,count)
            combined.add(id)
        } else if (!combined.has(id)) totals.set(id,(totals.get(id) || 0)+count)
    }
    return totals
}

async function recordGame(career, id) {
    const set = career.resultSets?.find(item=>item.name==='CareerHighs')
    const row = set?.rowSet.find(row=>String(row[set.headers.indexOf('GAME_ID')])===id)
    if (!row) return null
    const date = String(row[set.headers.indexOf('DATE_EST')] || '').slice(0,10)
    const season = career.seasons.find(value=>value.slice(2,4)===id.padStart(10,'0').slice(3,5))
    if (!season) return null
    const year = yearOf(season)
    const opponent = canonical(row[set.headers.indexOf('VS_TEAM_ABBREVIATION')])
    const athlete = findAthlete(await league(year).catch(()=>null),career.player.PLAYER_NAME)
    const games = await gameLog(career,season,athlete?.id)
    const est = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'})
    return games.find(game=>game.id===id || (game.id.startsWith('espn:') && game.opponent===opponent && est.format(new Date(game.date))===date))
        || (athlete ? (await nbaGames(career.player.PLAYER_ID,season)).find(game=>game.id===id) : null)
}

async function careerGames(career) {
    const seasons = career.seasons || []
    const name = career.player.PLAYER_NAME
    const latest = seasons[0]
    const athlete = latest ? findAthlete(await league(yearOf(latest)).catch(()=>null),name) : null
    const expectedRegular = totalsBySeason(career,'SeasonTotalsRegularSeason')
    const expectedPlayoffs = totalsBySeason(career,'SeasonTotalsPostSeason')
    const games = new Map()
    const unavailable = []
    let index = 0
    await Promise.all(Array.from({length:Math.min(4,seasons.length)},async()=>{
        while (index<seasons.length) {
            const season = seasons[index++]
            try {
                const rows = await gameLog(career,season,athlete?.id)
                if (!rows.length || rows.filter(g=>g.stage==='regular').length < (expectedRegular.get(season) || 0)
                    || rows.filter(g=>g.stage==='playoffs').length < (expectedPlayoffs.get(season) || 0)) unavailable.push(season)
                for (const game of rows) games.set(game.id,{...game,season})
            } catch { unavailable.push(season) }
        }
    }))
    const opponents = {}
    for (const game of games.values()) {
        const row = opponents[game.opponent] ||= {team:game.opponent,games:0,wins:0,points:0,rebounds:0,assists:0,steals:0,blocks:0,turnovers:0}
        row.games++
        row.wins += Number(game.win)
        for (const key of Object.keys(metrics)) row[key] += game[key] || 0
    }
    // Rank scoring performances first; use rebounds and assists to break ties.
    const best = [...games.values()].sort((a,b)=>b.points-a.points || (b.rebounds+b.assists)-(a.rebounds+a.assists) || b.date.localeCompare(a.date)).slice(0,10)
    return {best,opponents:Object.values(opponents).sort((a,b)=>a.team.localeCompare(b.team)),unavailable:unavailable.sort().reverse(),games:games.size}
}

module.exports = {overview,current,careerGames,recordGame,espnGames}
