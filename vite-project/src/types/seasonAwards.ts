export type AwardEntity = { kind: 'player' | 'coach' | 'executive' | 'team'; id?: string; name: string; photoId?: string; abbr?: string; sourceUrl?: string }
export type SeasonAwardRow = { id: string; award: string; recipient: AwardEntity; period: string | null; periodLabel: string | null; conference: 'east' | 'west' | null; selection: number | null; team: AwardEntity | null }
export type SeasonAwardsData = { season: string; category: string; rows: SeasonAwardRow[]; complete: boolean; sources: {name: string; url: string}[]; updatedAt: string }
export const awardTabs = [
  {id:'week',label:'Игрок недели',stage:'regular'}, {id:'month',label:'Игрок месяца',stage:'regular'},
  {id:'rookie-month',label:'Новичок месяца',stage:'regular'}, {id:'defense-month',label:'Защитник месяца',stage:'regular'}, {id:'coach-month',label:'Тренер месяца',stage:'regular'},
  {id:'season',label:'Награды сезона',stage:'regular'}, {id:'all-nba',label:'Сборные НБА',stage:'regular'}, {id:'all-defense',label:'Сборные защиты',stage:'regular'}, {id:'all-rookie',label:'Сборные новичков',stage:'regular'},
  {id:'finals-mvp',label:'MVP финала',stage:'playoffs'}, {id:'conference-mvp',label:'MVP финалов конференций',stage:'playoffs'}, {id:'champions',label:'Чемпион НБА',stage:'playoffs'}
]
