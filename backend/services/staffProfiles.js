const axios=require('axios')
const cache=require('../utils/fetchWithCache')
const {ROOT,document,page}=require('./basketballReference')
const aliases={BRK:'BKN',CHO:'CHA',CHH:'CHA',NJN:'BKN',NOH:'NOP',NOK:'NOP',SEA:'OKC',VAN:'MEM',PHO:'PHX',WSB:'WAS'}
const validTeams=new Set(Object.values(require('../constants/teamMap')).map(t=>t.abbr))
const clean=text=>text.replace(/\s+/g,' ').trim()
const number=text=>text!==''&&Number.isFinite(Number(text))?Number(text):null
const canonical=abbr=>aliases[abbr] || abbr
function team($,link) {
    const a=$(link),match=/^\/teams\/([A-Z]{2,4})\/(\d{4})\.html$/.exec(a.attr('href') || '')
    return match?{abbr:canonical(match[1]),archiveAbbr:match[1],name:a.attr('title') || clean(a.text()),localLogo:validTeams.has(canonical(match[1]))}:null
}
function person($,link) {
    const a=$(link),match=/^\/(coaches|executives)\/([a-z0-9]{3,24})\.html$/.exec(a.attr('href') || '')
    return match?{role:match[1]==='coaches'?'coach':'executive',id:match[2],name:clean(a.text())}:null
}
function translateAward(text) {
    return clean(text).replace('NBA Executive of the Year','Руководитель года НБА').replace('NBA Coach of the Year','Тренер года НБА').replace('NBCA Coach of the Year','Тренер года по версии NBCA')
        .replace('Eastern Conference Coach of the Month','Тренер месяца Востока').replace('Western Conference Coach of the Month','Тренер месяца Запада')
        .replace('Coach of the Year','Тренер года НБА').replace('NBA Champion','Чемпион НБА').replace('NBA Championships','Чемпион НБА')
        .replace(/January|February|March|April|May|June|July|August|September|October|November|December/g,m=>({January:'январь',February:'февраль',March:'март',April:'апрель',May:'май',June:'июнь',July:'июль',August:'август',September:'сентябрь',October:'октябрь',November:'ноябрь',December:'декабрь'})[m])
}
function photoSource(value,role,id) {
    if (!value) return null
    try {
        const url=new URL(value,ROOT)
        if (url.protocol!=='https:') return null
        const local=url.hostname==='www.basketball-reference.com' && /^\/req\/\d+\/images\/headshots\/[a-z0-9]+\.(png|jpg|jpeg)$/.test(url.pathname)
        const wiki=['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname) && url.pathname.startsWith('/wikipedia/commons/') && /\.(png|jpg|jpeg)$/i.test(url.pathname)
        if (!local && !wiki) return null
        url.search='';url.hash=''
        const png=/\.png$/i.test(url.pathname)
        return {name:`${role}-${id}.${png?'png':'jpg'}`,type:png?'image/png':'image/jpeg',url:url.href,folder:'Staff'}
    } catch { return null }
}

function parseProfile(html,role,id) {
    const $=document(html), meta=$('#meta'), name=clean(meta.find('h1').first().text())
    if (!name) throw new Error('Профиль не найден')
    const table=role==='coach'?'coach-stats':'exec-stats'
    if (!$(`#${table}`).length) throw new Error('История работы недоступна')
    const stints=[]
    $(`#${table} tbody tr`).each((_,tr)=>{
        const value=key=>clean($(tr).find(`[data-stat="${key}"]`).text())
        const season=value('season'), club=team($,$(tr).find('[data-stat="team_id"] a').first()), league=value('lg_id')
        if (!/^\d{4}-\d{2}$/.test(season) || !club || !['NBA','BAA'].includes(league)) return
        stints.push({season,team:club,position:role==='executive'?'executive':/Assistant/i.test(value('role'))?'assistant':'head',games:number(value('g')),wins:number(value('wins')),losses:number(value('losses')),divisionRank:number(value('rank_team')),
            playoffGames:number(value('g_playoffs')),playoffWins:number(value('wins_playoffs')),playoffLosses:number(value('losses_playoffs')),notes:value('coach_remarks')})
    })
    const awards=[]
    $('#coach-awards tbody tr').each((_,tr)=>{
        const season=clean($(tr).find('[data-stat="season"]').text()),label=clean($(tr).find('[data-stat="award_id"]').text())
        if (season && label) awards.push({season,label:translateAward(label)})
    })
    $('#div_awards li').each((_,li)=>{
        const text=clean($(li).text()),match=/^(\d{4}-\d{2})\s+(.+)$/.exec(text)
        if (match) awards.push({season:match[1],label:translateAward(match[2])})
    })
    for (const stint of stints) if (/NBA Champs/.test(stint.notes)) awards.push({season:stint.season,label:'Чемпион НБА'})
    const history=[]
    for (const stint of stints) {
        const last=history.at(-1),year=Number(stint.season.slice(0,4))
        if (last && last.team.archiveAbbr===stint.team.archiveAbbr && last.position===stint.position && year<=last.endYear+1) {last.endYear=year;last.endSeason=stint.season}
        else history.push({team:stint.team,position:stint.position,startYear:year,endYear:year,startSeason:stint.season,endSeason:stint.season})
    }
    return {id,role,name,birthDate:meta.find('#necro-birth').attr('data-birth') || null,deathDate:meta.find('#necro-death').attr('data-death') || null,
        stints:[...stints].reverse(),history:history.reverse(),awards:[...new Map(awards.map(a=>[JSON.stringify(a),a])).values()].sort((a,b)=>b.season.localeCompare(a.season)),
        image:photoSource(meta.find('.media-item img').attr('src'),role,id),source:`${ROOT}/${role==='coach'?'coaches':'executives'}/${id}.html`}
}

function archiveTeam(abbr,year) {
    if (abbr==='BKN') return year<=2012?'NJN':'BRK'
    if (abbr==='CHA') return year<=2002?'CHH':year<=2014?'CHA':'CHO'
    if (abbr==='NOP') return year<=2002?'CHH':year===2006 || year===2007?'NOK':year<=2013?'NOH':'NOP'
    if (abbr==='OKC' && year<=2008) return 'SEA'
    if (abbr==='MEM' && year<=2001) return 'VAN'
    return abbr==='PHX'?'PHO':abbr
}
function parseTeamSeason(html,abbr,season) {
    const $=document(html), meta=$('#meta'),year=Number(season.slice(0,4))+1
    if (!clean(meta.find('h1').text()).startsWith(season)) throw new Error('Другой сезон команды')
    const staff=[]
    meta.find('a[href^="/coaches/"],a[href^="/executives/"]').each((_,a)=>{
        const item=person($,a)
        if (item && !staff.some(p=>p.role===item.role && p.id===item.id)) {
            const following=a.nextSibling?.data || '',record=/\((\d+)-(\d+)\)/.exec(following)
            staff.push({...item,wins:record?Number(record[1]):null,losses:record?Number(record[2]):null})
        }
    })
    const recordText=clean(meta.find('p').filter((_,p)=>/^Record:/.test(clean($(p).text()))).first().text())
    const record=/Record:\s*(\d+)-(\d+)/.exec(recordText),rank=/(\d+)(?:st|nd|rd|th) in (?:the )?(?:NBA |BAA )?(Eastern|Western) (Conference|Division)/.exec(recordText)
    const playoffParagraph=meta.find('p').filter((_,p)=>$(p).find(`a[href="/playoffs/NBA_${year}.html"],a[href="/playoffs/BAA_${year}.html"]`).length>0).first()
    const parts=(playoffParagraph.html() || '').split(/<br\s*\/?\s*>/i).map(part=>clean(document(part).text())).filter(part=>/^(Won|Lost) /.test(part))
    let playoffResult=null,playoffPlace=null
    if (parts.some(p=>/^Won (NBA|BAA) Finals/.test(p))) {playoffResult='Чемпион НБА';playoffPlace=1}
    else if (parts.some(p=>/^Lost (NBA|BAA) Finals/.test(p))) {playoffResult='Финал НБА';playoffPlace=2}
    else if (parts.some(p=>/^Lost .*Conference Finals/.test(p))) playoffResult='Финал конференции'
    else if (parts.some(p=>/^Lost .*Division Finals/.test(p))) playoffResult='Финал дивизиона'
    else if (parts.some(p=>/^Lost .*Semifinals/.test(p))) playoffResult='Полуфинал конференции'
    else if (parts.some(p=>/^Lost .*First Round/.test(p))) playoffResult='Первый раунд'
    else if (parts.some(p=>/^Won .*Conference Finals/.test(p))) playoffResult='Выход в финал НБА'
    else if (parts.some(p=>/^Won .*Semifinals/.test(p))) playoffResult='Выход в финал конференции'
    else if (parts.some(p=>/^Won .*First Round/.test(p))) playoffResult='Выход в полуфинал конференции'
    else if (parts.some(p=>/Play.In/.test(p))) playoffResult='Плей-ин'
    else if (parts.length) playoffResult='Участие в плей-офф'
    const now=new Date(),currentYear=Number(new Intl.DateTimeFormat('en',{timeZone:'Europe/Moscow',year:'numeric'}).format(now))
    const currentMonth=Number(new Intl.DateTimeFormat('en',{timeZone:'Europe/Moscow',month:'numeric'}).format(now))
    const latest=currentYear-(currentMonth<9?1:0)
    if (!playoffResult) playoffResult=Number(season.slice(0,4))<latest?'Не вышли в плей-офф':'Результат пока не определён'
    return {abbr,season,name:clean(meta.find('h1').text()).replace(`${season} `,'').replace(' Roster and Stats',''),staff,
        wins:record?Number(record[1]):null,losses:record?Number(record[2]):null,conferenceRank:rank?Number(rank[1]):null,
        rankScope:rank?.[3]==='Division'?'division':'conference',conference:rank?.[2]==='Eastern'?'east':rank?.[2]==='Western'?'west':null,
        playoffResult,playoffPlace,source:`${ROOT}/teams/${archiveTeam(abbr,year)}/${year}.html`}
}

async function baseProfile(role,id) {
    return cache({key:`staff-profile-v1:${role}:${id}`,ttl:3600000,fetcher:async()=>parseProfile(await page(`/${role==='coach'?'coaches':'executives'}/${id}.html`),role,id)})
}
async function teamSeason(abbr,season) {
    const year=Number(season.slice(0,4))+1
    return cache({key:`team-staff-v1:${abbr}:${season}`,ttl:3600000,fetcher:async()=>parseTeamSeason(await page(`/teams/${archiveTeam(abbr,year)}/${year}.html`),abbr,season)})
}
async function staffProfile(role,id) {
    const {image,...profile}=await baseProfile(role,id)
    return {...profile,photoId:`staff:${role}:${id}`}
}
async function staffSeason(role,id,season) {
    const profile=await baseProfile(role,id),stints=profile.stints.filter(row=>row.season===season),results=[]
    await Promise.all(stints.map(async stint=>{
        try { results.push({stint,result:await teamSeason(stint.team.abbr,season)}) }
        catch { results.push({stint,result:null}) }
    }))
    return {season,results}
}
async function staffImageSource(role,id) {
    const profile=await baseProfile(role,id)
    if (profile.image) return profile.image
    return cache({key:`staff-wiki-image:${role}:${id}`,ttl:86400000,fetcher:async()=>{
        const titles=role==='coach'?[`${profile.name} (basketball, born ${profile.birthDate?.slice(0,4)})`,`${profile.name} (basketball)`,profile.name]:[profile.name]
        for (const title of titles) {
            const {data}=await axios.get('https://en.wikipedia.org/w/api.php',{params:{action:'query',titles:title.replaceAll(' ','_'),prop:'pageimages',format:'json',pithumbsize:600},headers:{'User-Agent':'Basketsfera/1.0 (https://basketsfera.ru; staff portraits)'},timeout:10000})
            const match=Object.values(data.query?.pages || {}).find(p=>p.title===title && p.thumbnail?.source)
            const source=photoSource(match?.thumbnail?.source,role,id)
            if (source) return source
        }
        return null
    }})
}
module.exports={staffProfile,staffSeason,teamSeason,staffImageSource,parseProfile,parseTeamSeason}
