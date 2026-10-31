<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="text-lg font-black text-slate-900">Динамика OVR</h3><p class="mt-1 text-xs text-slate-500">Регулярный сезон {{ season-1 }}–{{ String(season).slice(-2) }} · после сыгранных матчей</p></div><span v-if="slateOvr" class="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">{{ slateOvr }} <span class="text-amber-300">OVR тура</span></span></div>
    <p v-if="loading || result?.status==='loading'" role="status" class="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Восстанавливаем историю сезона… <span v-if="result?.total">Получено {{ result.loaded }} из {{ result.total }} матчей лиги.</span> При первом открытии это может занять несколько минут.</p>
    <p v-if="error || result?.error" role="alert" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{{ error || result?.error }} <button class="font-bold underline" @click="load">Повторить</button></p>
    <template v-if="series.length">
      <div class="grid grid-cols-3 gap-2"><div v-for="stat in stats" :key="stat.label" class="rounded-xl bg-slate-50 p-3"><p class="text-xl font-black text-slate-900">{{ stat.value }}</p><p class="mt-1 text-[11px] text-slate-500">{{ stat.label }}</p></div></div>
      <div class="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/60 to-white p-3">
        <svg viewBox="0 0 640 240" class="block w-full" role="img" :aria-label="`OVR после матчей сезона: ${series.map(p=>`${p.game} — ${p.ovr}`).join(', ')}`">
          <g v-for="tick in ticks" :key="tick"><line x1="40" x2="616" :y1="y(tick)" :y2="y(tick)" stroke="#dbeafe" stroke-dasharray="4 5" /><text x="30" :y="y(tick)+4" text-anchor="end" fill="#64748b" font-size="12">{{ tick }}</text></g>
          <polyline :points="line" fill="none" stroke="#2563eb" stroke-width="3" stroke-linejoin="round" />
          <g v-for="(point,i) in series" :key="point.gameId"><circle :cx="x(i)" :cy="y(point.ovr)" :r="selected===i?6:4" :fill="selected===i?'#4f46e5':'#2563eb'" stroke="white" stroke-width="2" /><text v-if="i===0 || i===series.length-1" :x="x(i)" y="232" text-anchor="middle" fill="#64748b" font-size="12">Игра {{ point.game }}</text></g>
        </svg>
        <p class="text-center text-xs text-slate-500">{{ series.length===1 ? 'Пока доступна одна игра — линия появится после следующей.' : 'Выберите матч ниже, чтобы увидеть рейтинг и изменение.' }}</p>
      </div>
      <label class="block text-xs font-bold text-slate-600">Матч сезона<select v-model.number="selected" aria-label="Матч сезона" class="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"><option v-for="(point,i) in series" :key="point.gameId" :value="i">#{{ point.game }} · {{ shortDate(point.date) }} · {{ point.matchup }} · {{ point.ovr }} OVR</option></select></label>
      <RouterLink v-if="current" :to="`/game/${current.gameId.replace('espn:','')}`" class="flex flex-wrap justify-between gap-2 rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-900">{{ current.matchup }} · {{ shortDate(current.date) }} ↗ <span>{{ current.ovr }} OVR · {{ delta > 0 ? '+' : '' }}{{ delta }}</span></RouterLink>
    </template>
    <p v-else-if="result?.status==='ready'" class="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">В этом регулярном сезоне пока нет сыгранных матчей игрока.</p>
    <p class="text-xs leading-5 text-slate-500">Ретроспективный расчёт по сохранённым протоколам ESPN и формуле OVR. После каждой игры учитываем накопленную на тот момент статистику всей лиги; игры с одинаковым временем начала обрабатываются вместе. Для сравнения используем позиции игроков из текущей базы сезона. Это восстановленная динамика, а не архив показанных ранее оценок. Исправления источника и время фиксации тура могут давать отличие от OVR на карточке. Бонусы уровня и личный XP здесь не учитываются.</p>
  </section>
</template>
<script setup lang="ts">
import {computed,onUnmounted,ref,watch} from 'vue'
import {authFetch} from '../../api/authFetch'
type Point={gameId:string;date:string;matchup:string;game:number;ovr:number}
type History={status:'ready'|'loading'|'error';points:Point[];loaded:number;total:number;error?:string;updatedAt?:string}
const props=defineProps<{playerId:string;season:number;slateOvr?:number}>()
const result=ref<History|null>(null),loading=ref(false),error=ref(''),selected=ref(0)
const series=computed(()=>result.value?.points||[]),current=computed(()=>series.value[selected.value])
const delta=computed(()=>current.value?current.value.ovr-(series.value[selected.value-1]?.ovr||80):0)
const low=computed(()=>Math.max(60,Math.min(75,...series.value.map(p=>p.ovr))-2)),high=computed(()=>Math.min(99,Math.max(85,...series.value.map(p=>p.ovr))+2))
const ticks=computed(()=>[low.value,Math.round((low.value+high.value)/2),high.value])
const x=(i:number)=>series.value.length===1?328:48+i*560/(series.value.length-1)
const y=(value:number)=>208-(value-low.value)*188/(high.value-low.value)
const line=computed(()=>series.value.map((p,i)=>`${x(i)},${y(p.ovr)}`).join(' '))
const stats=computed(()=>[{label:'Последний расчёт',value:series.value.at(-1)?.ovr},{label:'Лучший OVR',value:Math.max(...series.value.map(p=>p.ovr))},{label:'Изменение с 1-й игры',value:(series.value.at(-1)!.ovr-series.value[0]!.ovr>0?'+':'')+(series.value.at(-1)!.ovr-series.value[0]!.ovr)}])
const shortDate=(date:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short'}).format(new Date(date))
let timer:ReturnType<typeof setTimeout>|undefined,revision=0
const controller=new AbortController()
async function load(){
 const id=++revision;clearTimeout(timer);if(!result.value)loading.value=true;error.value=''
 try{const data=await authFetch(`/api/fantasy/players/${props.playerId}/rating-history?season=${props.season}`,{signal:controller.signal});if(id!==revision)return;result.value=data;if(selected.value>=data.points.length)selected.value=Math.max(0,data.points.length-1);if(data.status==='loading'||data.updating)timer=setTimeout(load,4000)}catch(e:any){if(!controller.signal.aborted)error.value=e.message}finally{if(id===revision)loading.value=false}
}
watch(()=>[props.playerId,props.season],()=>{revision++;result.value=null;selected.value=0;void load()},{immediate:true})
onUnmounted(()=>{revision++;clearTimeout(timer);controller.abort()})
</script>
