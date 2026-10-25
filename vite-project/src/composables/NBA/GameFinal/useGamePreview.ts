import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { internalGameId, publicGameId } from '../../../api/gameNavigation'
export function useGamePreview(id: Ref<string>) {
 const router=useRouter(), now=ref(Date.now())
 const query=useQuery({
  queryKey:computed(()=>['game-preview',internalGameId(id.value)]),
  queryFn:async({signal,queryKey}):Promise<any>=>{
   const response=await fetch(`/api/game-preview/${encodeURIComponent(String(queryKey[1]))}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(35000)])})
   const data=await response.json()
   if(!response.ok) throw new Error(data.error || 'Не удалось загрузить матч')
   return data
  },staleTime:15000,gcTime:15*60000,refetchInterval:query=>{
   const data=query.state.data as any
   return data && Date.parse(data.dateUTC)-Date.now()<60000?5000:30000
  },refetchOnWindowFocus:true,refetchOnReconnect:true,retry:1
 })
 const remaining=computed(()=>Math.max(0,Date.parse(query.data.value?.dateUTC || '')-now.value))
 const countdown=computed(()=>{
  if(!Number.isFinite(remaining.value)) return '—'
  const seconds=Math.floor(remaining.value/1000),days=Math.floor(seconds/86400)
  const time=[Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':')
  return `${days?days+'д ':''}${time}`
 })
 let timer:ReturnType<typeof setInterval>
 onMounted(()=>{timer=setInterval(()=>{now.value=Date.now()},1000)})
 onUnmounted(()=>clearInterval(timer))
 watch(()=>query.data.value,data=>{
  if(data && (data.state!=='pre'||data.completed)) void router.replace({name:'GameDetail',params:{gameId:publicGameId(data.gameId)}})
 },{immediate:true})
 return {preview:query.data,loading:query.isPending,error:query.error,countdown,remaining,retry:()=>query.refetch()}
}
