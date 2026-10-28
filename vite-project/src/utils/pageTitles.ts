export const siteTitle=(label:string)=>`${label.trim()} | Basketsfera.ru`
const teams:Record<string,string>={ATL:'Atlanta Hawks',BOS:'Boston Celtics',BKN:'Brooklyn Nets',CHA:'Charlotte Hornets',CHI:'Chicago Bulls',CLE:'Cleveland Cavaliers',DAL:'Dallas Mavericks',DEN:'Denver Nuggets',DET:'Detroit Pistons',GSW:'Golden State Warriors',HOU:'Houston Rockets',IND:'Indiana Pacers',LAC:'Los Angeles Clippers',LAL:'Los Angeles Lakers',MEM:'Memphis Grizzlies',MIA:'Miami Heat',MIL:'Milwaukee Bucks',MIN:'Minnesota Timberwolves',NOP:'New Orleans Pelicans',NYK:'New York Knicks',OKC:'Oklahoma City Thunder',ORL:'Orlando Magic',PHI:'Philadelphia 76ers',PHX:'Phoenix Suns',POR:'Portland Trail Blazers',SAC:'Sacramento Kings',SAS:'San Antonio Spurs',TOR:'Toronto Raptors',UTA:'Utah Jazz',WAS:'Washington Wizards'}
export function routeTitle(route:{path:string;params:Record<string,any>;query?:Record<string,any>}) {
 const {path,params}=route
 if(path==='/')return 'Basketsfera'
 const fixed:Record<string,string>={'/fantasy':'Фентези НБА','/profile':'Настройки профиля','/standings':'Турнирная таблица НБА','/playoffs':'Плей-офф НБА','/teams':'Команды НБА','/news':'Новости баскетбола','/patch-note':'Патч ноут','/player-stats':'Статистика игроков НБА','/player-stats/all':'Статистика игроков НБА','/player-stats/playoffs':'Статистика игроков — Плей-офф'}
 if(fixed[path])return siteTitle(fixed[path]+(path==='/news'&&route.query?.tag?` — #${route.query.tag}`:''))
 if(path.startsWith('/team/')){
  const abbr=String(params.abbr||'').toUpperCase(),sections:Record<string,string>={contracts:'Контракты',games:'Матчи',roster:'Состав',stats:'Статистика',about:'О команде',upcoming:'Ближайшие матчи',history:'История игр',form:'Форма команды',articles:'Статьи'}
  return siteTitle(`${teams[abbr]||abbr}${params.section?` — ${sections[String(params.section)]||'Статистика'}`:''}`)
 }
 if(path.startsWith('/player/'))return siteTitle(`${params.name} — Статистика игрока`)
 if(path.startsWith('/profile/'))return siteTitle('Профиль пользователя')
 if(path.startsWith('/pre-game/'))return siteTitle('Предстоящий матч')
 if(path.startsWith('/game/'))return siteTitle('Матч НБА')
 if(path.startsWith('/news/'))return siteTitle('Новость')
 if(path.startsWith('/legal/'))return siteTitle('Правовая информация')
 if(path.startsWith('/games/')){
  const value=String(params.date||''),date=new Date(`${value}T12:00:00Z`)
  return siteTitle(`Матчи${Number.isFinite(date.getTime())?' — '+new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',year:'numeric'}).format(date):''}`)
 }
 return siteTitle('Баскетбол')
}
