const axios = require('axios')
const cheerio = require('cheerio')
const cache = require('../utils/fetchWithCache')
const ROOT = 'https://www.basketball-reference.com'
const aliases = { BRK:'BKN',CHO:'CHA',CHH:'CHA',NOH:'NOP',NOK:'NOP',NJN:'BKN',SEA:'OKC',VAN:'MEM',PHO:'PHX',GS:'GSW',NY:'NYK',SA:'SAS',NO:'NOP',WSH:'WAS' }
const categories = {
    week:'Игрок недели', month:'Игрок месяца', 'rookie-month':'Новичок месяца', 'defense-month':'Защитник месяца', 'coach-month':'Тренер месяца',
    season:'Награды сезона', 'all-nba':'Сборные НБА', 'all-defense':'Сборные защиты', 'all-rookie':'Сборные новичков',
    'finals-mvp':'MVP финала', 'conference-mvp':'MVP финалов конференций', champions:'Чемпион НБА'
}
const annual = [
    ['coy','Тренер года'],['eoy','Руководитель года'],['tmoy','Лучший товарищ по команде'],['sportsmanship','Спортивное поведение'],
    ['citizenship','Награда Дж. Уолтера Кеннеди'],['social_justice','Борец за социальную справедливость'],['nbca_coy','Тренер года по версии NBCA'],['reg_rec','Лучший результат регулярного сезона']
]
const labels = { mvp:'MVP регулярного сезона',roy:'Новичок года',dpoy:'Защитник года',mip:'Самый прогрессирующий игрок',smoy:'Лучший шестой игрок',clutch_poy:'Лучший игрок в концовках',hustle:'Награда за самоотдачу' }
const sourceTitles = {...Object.fromEntries(annual),finals_mvp:'MVP финала',ecf_mvp:'MVP финала Востока',wcf_mvp:'MVP финала Запада'}
const monthly = { 'Players of the Week':'week','Players of the Month':'month','Rookies of the Month':'rookie-month','Defensive Players of the Month':'defense-month','Coaches of the Month':'coach-month' }
const monthNames = {January:'Январь',February:'Февраль',March:'Март',April:'Апрель',May:'Май',June:'Июнь',July:'Июль',August:'Август',September:'Сентябрь',October:'Октябрь',November:'Ноябрь',December:'Декабрь'}
const clean = value => value.replace(/\s+/g,' ').trim()
const abbr = value => aliases[value] || value

function document(html) {
    return cheerio.load(html.replace(/<!--([\s\S]*?)-->/g, (_,body) => body.includes('<table') || body.includes('data_grid') ? body : ''))
}
async function page(path) {
    return cache({key:`awards-page:${path}`,ttl:3600000,fetcher:async()=>{
        const {data} = await axios.get(`${ROOT}${path}`,{timeout:15000,maxContentLength:8*1024*1024})
        if (typeof data!=='string' || !data.includes('<h1')) throw new Error('Неожиданный ответ архива')
        return data
    }})
}
function entity($, anchor) {
    const a = $(anchor), href = a.attr('href') || '', name = clean(a.text())
    const player = /^\/players\/[a-z]\/([a-z0-9]+)\.html$/.exec(href)
    if (player) return {kind:'player',name,photoId:`bbref:${player[1]}`}
    const team = /^\/teams\/([A-Z]{2,4})\//.exec(href)
    if (team) return {kind:'team',name,abbr:abbr(team[1])}
    if (/^\/(coaches|executives)\/[a-z0-9]+\.html$/.test(href)) return {kind:href.startsWith('/coaches/')?'coach':'executive',name,sourceUrl:`${ROOT}${href}`}
    return null
}
function teamOf($, row) {
    const link = $(row).find('a[href^="/teams/"]').first()
    return link.length ? entity($,link) : null
}
function row(award, person, extra={}) { return {award,recipient:person,period:null,periodLabel:null,conference:null,selection:null,team:null,...extra} }
function dedupe(rows) {
    const unique = new Map(rows.map(r=>[JSON.stringify([r.award,r.recipient,r.period,r.periodLabel,r.conference,r.selection]),r]))
    return [...unique.values()].map((r,i)=>({...r,id:String(i)}))
}
function weeklyDate(text, year) {
    const match = /^([A-Za-z]+)\s+(\d{1,2})$/.exec(text)
    if (!match) return null
    const index = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[1].slice(0,3))
    return index<0 ? null : `${index>=8?year-1:year}-${String(index+1).padStart(2,'0')}-${match[2].padStart(2,'0')}`
}

function parseSeason(html, year) {
    const $ = document(html), season = `${year-1}-${String(year).slice(-2)}`
    if (!clean($('h1').text()).startsWith(`${season} NBA`)) throw new Error('В архиве другой сезон')
    const groups = Object.fromEntries(Object.keys(categories).map(id=>[id,[]]))
    $('#div_players_of_the_week_and_month .data_grid_box').each((_,box)=>{
        const month = clean($(box).find('.gridtitle').text())
        let kind = null, date = null
        $(box).children().each((_,child)=>{
            const tag = child.tagName
            if (tag==='h3') { kind = monthly[clean($(child).text())] || null; date=null; return }
            if (tag!=='p' || !kind) return
            const strong = clean($(child).find('strong').text())
            if (strong) { date=weeklyDate(strong,year); return }
            const person = entity($,$(child).find('a').first())
            if (!person) return
            const conf = /^([EW])\s*-/.exec(clean($(child).text()))?.[1]
            const monthIndex=Object.keys(monthNames).indexOf(month)+1
            const monthDate=monthIndex?`${monthIndex>=9?year-1:year}-${String(monthIndex).padStart(2,'0')}-01`:null
            groups[kind].push(row(categories[kind],person,{period:kind==='week'?date:monthDate,periodLabel:kind==='week'?date || month:monthNames[month] || month,conference:conf==='E'?'east':conf==='W'?'west':null}))
        })
    })
    $('#all_awards tbody tr').each((_,tr)=>{
        const cells=$(tr).children('td'), href=$(cells[0]).find('a').attr('href') || '', key=/\/awards\/([a-z_]+)\.html/.exec(href)?.[1]
        if (!labels[key]) return
        $(cells[1]).find('a').each((_,a)=>{const person=entity($,a);if(person)groups.season.push(row(labels[key],person))})
    })
    for (const [group,selector] of [['all-nba','div_all-nba'],['all-defense','div_all-defensive'],['all-rookie','div_all-rookie']]) {
        $(`#${selector} table`).each((i,table)=>{
            $(table).find('a[href^="/players/"]').each((_,a)=>{const person=entity($,a);if(person)groups[group].push(row(categories[group],person,{selection:i+1}))})
        })
    }
    $('p').filter((_,p)=>$(p).find('strong').first().text().trim()==='League Champion').each((_,p)=>{
        const champion = teamOf($,p)
        if (champion) groups.champions.push(row('Чемпион НБА',champion))
    })
    return groups
}

function parseHistory(html, season, label) {
    const $=document(html), result=[]
    const tables=$('table').filter((_,table)=>$(table).find('[data-stat="season"]').length>0)
    if (!tables.length) throw new Error('Таблица награды отсутствует')
    tables.find('tbody tr').each((_,tr)=>{
        if (clean($(tr).find('[data-stat="season"]').text())!==season) return
        const league=clean($(tr).find('[data-stat="lg_id"]').text())
        if (league && league!=='NBA') return
        const link=$(tr).find('a[href^="/players/"],a[href^="/coaches/"],a[href^="/executives/"]').first()
        const person=link.length?entity($,link):teamOf($,tr)
        if (person) result.push(row(label,person,{team:teamOf($,tr)}))
    })
    return result
}

async function seasonAwards(season, category) {
    const year=Number(season.slice(0,4))+1
    return cache({key:`season-awards-v1:${season}:${category}`,ttl:3600000,fetcher:async()=>{
        const sources=[],missing=[],rows=[]
        const add = async (path,parse)=>{
            try {
                rows.push(...parse(await page(path)))
                const title=path.startsWith('/leagues/')?`Сезон ${season}`:sourceTitles[path.split('/').pop().replace('.html','')]
                sources.push({name:`${title} · Basketball Reference`,url:`${ROOT}${path}`})
            }
            catch (error) { missing.push(path); console.warn('Season awards:',path,error.message) }
        }
        const path=`/leagues/NBA_${year}.html`
        if (category==='season') {
            await add(path,html=>parseSeason(html,year).season)
            const queue=[...annual]
            await Promise.all(Array.from({length:3},async()=>{while(queue.length){const [id,label]=queue.shift();await add(`/awards/${id}.html`,html=>parseHistory(html,season,label))}}))
        } else if (category==='finals-mvp' || category==='conference-mvp') {
            const items=category==='finals-mvp'?[['finals_mvp','MVP финала НБА']]:[['ecf_mvp','MVP финала Востока'],['wcf_mvp','MVP финала Запада']]
            await Promise.all(items.map(([id,label])=>add(`/awards/${id}.html`,html=>parseHistory(html,season,label))))
        } else await add(path,html=>parseSeason(html,year)[category])
        if (!sources.length) throw new Error('Архив наград временно недоступен')
        const sorted=dedupe(rows).sort((a,b)=>(a.selection || 0)-(b.selection || 0) || (a.period || '').localeCompare(b.period || '') || a.award.localeCompare(b.award,'ru'))
        return {season,category,rows:sorted,complete:missing.length===0,sources,updatedAt:new Date().toISOString()}
    }})
}

module.exports={seasonAwards,categories,parseSeason,parseHistory}
