import type {Entry} from './types'
export function fantasyMarks(entries:Entry[]){
  const map:Record<string,string[]>={}
  for(const entry of entries){
    if(entry.mode!=='unlimited'&&entry.mode!=='balanced')continue
    if(!map[entry.week])map[entry.week]=[]
    if(!map[entry.week]!.includes(entry.mode))map[entry.week]!.push(entry.mode)
  }
  return map
}
export function calendarMonth(month:string){
  const first=new Date(`${month}-01T12:00:00Z`)
  first.setUTCDate(1-(first.getUTCDay()+6)%7)
  return Array.from({length:42},(_,i)=>{
    const d=new Date(+first+i*86400000),date=d.toISOString().slice(0,10)
    return {date,day:d.getUTCDate(),current:date.startsWith(month)}
  })
}
