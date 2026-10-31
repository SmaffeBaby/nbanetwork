<template>
  <div ref="root" class="relative max-w-full" @keydown.esc.stop="close">
    <button ref="trigger" type="button" aria-haspopup="dialog" :aria-expanded="open" :aria-controls="id" class="flex min-h-12 max-w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-sm font-bold text-slate-800 shadow-sm hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50" :disabled="disabled" @click="toggle"><svg class="h-5 w-5 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18"/></svg><span>{{ modelValue?format(modelValue):placeholder || 'Выберите день' }}</span><span aria-hidden="true" class="text-slate-400">⌄</span></button>
    <div v-if="open" :id="id" role="dialog" aria-label="Календарь фентези" class="absolute left-0 z-50 mt-2 w-[min(320px,calc(100vw-48px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div class="mb-4 flex items-center justify-between gap-2"><button type="button" aria-label="Предыдущий месяц" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-xl hover:bg-slate-50" @click="move(-1)">‹</button><p class="text-sm font-black capitalize text-slate-900" aria-live="polite">{{ monthTitle }}</p><button type="button" aria-label="Следующий месяц" :disabled="nextDisabled" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-xl hover:bg-slate-50 disabled:opacity-30" @click="move(1)">›</button></div>
      <div role="group" aria-label="Дни месяца" class="grid grid-cols-7 gap-1"><span v-for="day in weekdays" :key="day" class="py-1 text-center text-[10px] font-bold text-slate-400">{{ day }}</span><button v-for="day in cells" :key="day.date" type="button" :data-date="day.date" :disabled="!!maxDate && day.date>maxDate" :aria-label="label(day.date)" :aria-current="day.date===today?'date':undefined" :aria-pressed="modelValue===day.date" class="relative flex h-10 flex-col items-center justify-center rounded-xl text-xs font-bold transition disabled:text-slate-200" :class="modelValue===day.date?'bg-blue-600 text-white shadow-sm':day.current?'text-slate-700 hover:bg-blue-50':'text-slate-300 hover:bg-slate-50'" @click="choose(day.date)" @keydown="navigate($event,day.date)"><span :class="day.date===today && day.date!==modelValue?'flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-blue-400':''">{{ day.day }}</span><span class="absolute bottom-1 flex gap-0.5" aria-hidden="true"><span v-if="marks[day.date]?.includes('unlimited')" class="h-1 w-1 rounded-full" :class="modelValue===day.date?'bg-white':'bg-blue-500'"/><span v-if="marks[day.date]?.includes('balanced')" class="h-1 w-1 rounded-full" :class="modelValue===day.date?'bg-amber-200':'bg-violet-500'"/></span></button></div>
      <div class="mt-3 space-y-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500"><p class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-blue-500"/>Состав «Без ограничений»</p><p class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-violet-500"/>Состав «Баланс-фентези»</p><div class="flex justify-between"><button class="py-1 font-bold text-blue-600" type="button" @click="choose(today)">Сегодня · МСК</button><button class="py-1 font-bold text-slate-500" type="button" @click="close">Закрыть</button></div></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import {computed,nextTick,onMounted,onUnmounted,ref,useId} from 'vue'
import type {Entry} from './types'
import {fantasyMarks,calendarMonth} from './calendar'
const props=defineProps<{modelValue:string;entries:Entry[];maxDate?:string;disabled?:boolean;placeholder?:string}>()
const emit=defineEmits<{'update:modelValue':[date:string]}>()
const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10),id=useId(),root=ref<HTMLElement|null>(null),trigger=ref<HTMLButtonElement|null>(null),open=ref(false),month=ref((props.modelValue||today).slice(0,7))
const weekdays=['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const marks=computed(()=>fantasyMarks(props.entries))
const format=(date:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00Z`))
const monthTitle=computed(()=>new Intl.DateTimeFormat('ru-RU',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(`${month.value}-01T12:00:00Z`)))
const nextDisabled=computed(()=>!!props.maxDate&&month.value>=props.maxDate.slice(0,7))
const cells=computed(()=>calendarMonth(month.value))
function label(date:string){const modes=marks.value[date]||[];return `${format(date)}${modes.length?` · Есть состав: ${modes.map(m=>m==='balanced'?'Баланс-фентези':'Без ограничений').join(', ')}`:''}`}
async function toggle(){open.value=!open.value;if(open.value){month.value=(props.modelValue||today).slice(0,7);await nextTick();root.value?.querySelector<HTMLElement>(`[data-date="${props.modelValue||today}"]`)?.focus()}}
function close(){open.value=false;trigger.value?.focus()}
function choose(date:string){if(props.maxDate&&date>props.maxDate)return;emit('update:modelValue',date);close()}
function move(n:number){if(n>0&&nextDisabled.value)return;const d=new Date(`${month.value}-01T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+n);month.value=d.toISOString().slice(0,7)}
async function navigate(e:KeyboardEvent,date:string){const shift=({ArrowRight:1,ArrowLeft:-1,ArrowUp:-7,ArrowDown:7} as Record<string,number>)[e.key];if(!shift)return;e.preventDefault();const next=new Date(Date.parse(`${date}T12:00:00Z`)+shift*86400000).toISOString().slice(0,10);if(props.maxDate&&next>props.maxDate)return;month.value=next.slice(0,7);await nextTick();root.value?.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus()}
function outside(e:PointerEvent){if(root.value&&!root.value.contains(e.target as Node))open.value=false}
onMounted(()=>document.addEventListener('pointerdown',outside));onUnmounted(()=>document.removeEventListener('pointerdown',outside))
</script>
