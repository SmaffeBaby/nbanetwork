<template>
 <section v-if="!hideEmptyClosed || data?.open || data?.total" class="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
  <div class="flex flex-wrap items-center justify-between gap-2">
   <h2 class="text-xl font-black text-gray-900 dark:text-white">Кто победит?</h2>
   <span class="text-xs font-semibold text-gray-500">Голосов: {{ data?.total ?? 0 }}</span>
  </div>
  <p class="mt-1 text-sm text-gray-500">{{ data?.open ? 'Выберите команду. До начала матча голос можно изменить или отменить.' : 'Голосование закрыто.' }}</p>
  <p v-if="!auth.user && data?.open" class="mt-2 text-sm font-semibold text-blue-600">Войдите в аккаунт, чтобы проголосовать.</p>
  <p v-if="error || mutation.error.value" role="alert" class="mt-3 text-sm text-red-600">{{ mutation.error.value?.message || error?.message }} <button class="underline" @click="refetch()">Обновить</button></p>
  <div v-if="isPending" class="py-5 text-sm text-gray-500">Загружаем голосование…</div>
  <div v-else-if="data" class="mt-5 grid gap-4 sm:grid-cols-2">
   <div v-for="side in ['away','home'] as const" :key="side" class="rounded-2xl border p-4 dark:border-slate-700" :class="data.viewerVote===side?'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30':'border-gray-100'">
    <button type="button" :disabled="!auth.user || !data.open || mutation.isPending.value" :aria-pressed="data.viewerVote===side" class="flex w-full items-center justify-between gap-3 text-left disabled:cursor-default" @click="mutation.mutate(data.viewerVote===side?null:side)">
     <span class="flex items-center gap-3"><img :src="getTeamLogo(teams[side]?.abbr || '')" alt="" class="h-10 w-10 object-contain"><span class="text-sm font-bold dark:text-white">{{ teams[side]?.name || side }} <span v-if="data.viewerVote===side" class="block text-xs text-blue-600">Ваш выбор</span></span></span>
     <span class="text-2xl font-black text-gray-900 dark:text-white">{{ percent(side) }}%</span>
    </button>
    <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800"><div class="h-full rounded-full bg-blue-600 transition-all duration-500" :style="{width:`${percent(side)}%`}" /></div>
    <div class="mt-3 flex min-h-9 flex-wrap items-center gap-1.5">
     <RouterLink v-for="voter in data.sides[side].voters" :key="voter.id" :to="`/profile/${voter.id}`" :title="voter.name || 'Профиль пользователя'" :aria-label="voter.name || 'Профиль пользователя'" class="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xs font-bold text-gray-600 ring-2 ring-white transition hover:ring-blue-400 dark:bg-slate-700 dark:ring-slate-900">
      <span>{{ (voter.name || 'У').slice(0,1) }}</span><img v-if="voter.avatar" :src="voter.avatar" alt="" class="absolute inset-0 h-full w-full object-cover" @error="hideImage">
     </RouterLink>
     <span v-if="data.sides[side].count > data.sides[side].voters.length" class="text-xs text-gray-500">+{{ data.sides[side].count-data.sides[side].voters.length }}</span>
     <span v-if="!data.sides[side].count" class="text-xs text-gray-400">Пока нет голосов</span>
    </div>
   </div>
  </div>
 </section>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {useMutation,useQuery,useQueryClient} from '@tanstack/vue-query'
import {useAuthStore} from '../../../stores/auth'
import {authFetch} from '../../../api/authFetch'
import {internalGameId} from '../../../api/gameNavigation'
import {getTeamLogo} from '../../../utils/getTeamLogo'
const props=defineProps<{gameId:string;teams:Record<string,any>;hideEmptyClosed?:boolean}>()
const auth=useAuthStore(),client=useQueryClient()
const key=computed(()=>['game-predictions',internalGameId(props.gameId),auth.user?.id || 'guest'])
const {data,error,isPending,refetch}=useQuery({queryKey:key,queryFn:async({queryKey,signal}):Promise<any>=>{
 const path=`/api/game-predictions/${encodeURIComponent(String(queryKey[1]))}`
 if(queryKey[2]!=='guest') return authFetch(path,{signal})
 const response=await fetch(path,{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])})
 const body=await response.json();if(!response.ok) throw new Error(body.error || 'Не удалось загрузить голосование');return body
},staleTime:10000,gcTime:5*60000,refetchInterval:15000,retry:1})
const mutation=useMutation({mutationFn:async(side:'home'|'away'|null)=>{
 if(!auth.user) throw new Error('Войдите, чтобы проголосовать')
 const queryKey=[...key.value]
 const result=await authFetch(`/api/game-predictions/${encodeURIComponent(internalGameId(props.gameId))}`,{method:'PUT',body:JSON.stringify({side})})
 return {result,queryKey}
},onSuccess:({result,queryKey})=>{client.setQueryData(queryKey,result)},onError:()=>{void refetch()}})
const percent=(side:string)=>data.value?.total?Math.round(data.value.sides[side].count/data.value.total*100):0
const hideImage=(event:Event)=>{(event.target as HTMLImageElement).style.display='none'}
</script>
