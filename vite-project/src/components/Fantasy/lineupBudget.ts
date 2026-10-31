import {slots,type Player,type Pick,type Slot} from './types'
// Minimum-cost assignment reserves a distinct available player for every open
// position. Considering the cheapest k players per slot is sufficient for k slots.
export function lineupBudget(players:Player[],picks:Pick[],active:Slot,cap:number){
  const fixed=picks.filter(p=>p.slot!==active),used=new Set(fixed.map(p=>p.id))
  const spent=fixed.reduce((sum,p)=>sum+(p.ovr??80),0)
  const empty=slots.filter(s=>s!==active&&!fixed.some(p=>p.slot===s))
  const eligible=players.filter(p=>!p.injury&&p.remaining>0&&!used.has(p.id)&&Number.isFinite(p.ovr))
  const pools=new Map(empty.map(slot=>[slot,eligible.filter(p=>p.positions.includes(slot)).sort((a,b)=>a.ovr!-b.ovr!)]))
  const options=new Map<string,{fits:boolean;reserve:number;ceiling:number}>()
  for(const p of eligible.filter(p=>p.positions.includes(active))){
    const lists=empty.map(slot=>pools.get(slot)!.filter(q=>q.id!==p.id).slice(0,empty.length)).sort((a,b)=>a.length-b.length)
    let best=Infinity
    const assigned=new Set<string>()
    function visit(index:number,cost:number){
      if(cost>=best)return
      if(index===lists.length){best=cost;return}
      for(const q of lists[index]!){if(assigned.has(q.id))continue;assigned.add(q.id);visit(index+1,cost+q.ovr!);assigned.delete(q.id)}
    }
    visit(0,0)
    const ceiling=cap-spent-best
    options.set(p.id,{fits:p.ovr!<=ceiling,reserve:best,ceiling})
  }
  return {options,maxOvr:Math.max(0,...eligible.filter(p=>options.get(p.id)?.fits).map(p=>p.ovr!)),free:cap-spent,remainingSlots:empty.length}
}
