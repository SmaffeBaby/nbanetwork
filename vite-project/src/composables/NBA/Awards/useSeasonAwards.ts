import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { awardTabs, type SeasonAwardsData } from '../../../types/seasonAwards'

export function useSeasonAwards() {
  const route=useRoute(), router=useRouter()
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const latest=Number(today.slice(0,4))-(Number(today.slice(5,7))<9?1:0)
  const seasons=Array.from({length:latest-1999},(_,i)=>`${latest-i}-${String(latest-i+1).slice(-2)}`)
  const readSeason=()=>seasons.includes(String(route.query.season))?String(route.query.season):seasons[0]!
  const readCategory=()=>awardTabs.some(tab=>tab.id===route.query.award)?String(route.query.award):'week'
  const season=ref(readSeason()), category=ref(readCategory())
  const selected=computed(()=>awardTabs.find(tab=>tab.id===category.value)!)
  const stage=computed(()=>selected.value.stage)
  const tabs=computed(()=>awardTabs.filter(tab=>tab.stage===stage.value))
  const query=useQuery({
    queryKey:computed(()=>['season-awards',season.value,category.value]),
    queryFn:async({signal,queryKey})=>{
      const response=await fetch(`/api/season-awards/${queryKey[1]}/${queryKey[2]}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(75000)])})
      const data=await response.json()
      if(!response.ok)throw new Error(data.error || 'Не удалось загрузить награды')
      return data as SeasonAwardsData
    }, staleTime:3600000,retry:1
  })
  watch([season,category],()=>{if(route.query.season!==season.value || route.query.award!==category.value)void router.replace({query:{...route.query,season:season.value,award:category.value}})})
  watch(()=>[route.query.season,route.query.award],()=>{season.value=readSeason();category.value=readCategory()})
  function selectStage(value:string){category.value=value==='playoffs'?'finals-mvp':'week'}
  return {season,seasons,category,stage,tabs,selected,query,selectStage}
}
