import {computed,ref,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {useQuery} from '@tanstack/vue-query'
import type {StaffProfile,StaffRole,StaffSeason} from '../../../types/staff'
export function useStaffProfile(){
  const route=useRoute(),router=useRouter()
  const role=computed<StaffRole>(()=>route.name==='ExecutiveProfile'?'executive':'coach'),id=computed(()=>String(route.params.id || ''))
  const query=useQuery({queryKey:computed(()=>['staff',role.value,id.value]),queryFn:async({signal,queryKey})=>{
    const response=await fetch(`/api/staff/${queryKey[1]}/${queryKey[2]}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(75000)])})
    const data=await response.json();if(!response.ok)throw new Error(data.error || 'Профиль недоступен');return data as StaffProfile
  },staleTime:3600000,retry:1})
  const season=ref(''),seasons=computed(()=>[...new Set(query.data.value?.stints.map(row=>row.season) || [])].sort().reverse())
  watch([seasons,()=>route.query.season],()=>{const requested=String(route.query.season || '');season.value=seasons.value.includes(requested)?requested:seasons.value[0] || ''},{immediate:true})
  watch(season,value=>{if(value && route.query.season!==value)void router.replace({query:{...route.query,season:value}})})
  const results=useQuery({queryKey:computed(()=>['staff-season',role.value,id.value,season.value]),enabled:computed(()=>Boolean(season.value && query.data.value)),queryFn:async({signal,queryKey})=>{
    const response=await fetch(`/api/staff/${queryKey[1]}/${queryKey[2]}/season/${queryKey[3]}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(75000)])})
    const data=await response.json();if(!response.ok)throw new Error(data.error || 'Результаты сезона недоступны');return data as StaffSeason
  },staleTime:3600000,retry:1})
  return {role,id,query,season,seasons,results}
}
