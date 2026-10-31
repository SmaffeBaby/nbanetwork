<template>
  <div ref="root" class="relative w-full min-w-0 sm:w-64" @keydown.esc.stop="close" @keydown="keys">
    <p :id="`${id}-label`" class="mb-1 text-xs font-semibold uppercase text-slate-500">Команда</p>
    <button ref="trigger" type="button" role="combobox" aria-haspopup="listbox" :aria-expanded="open" :aria-controls="`${id}-list`" :aria-labelledby="`${id}-label ${id}-value`" class="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 shadow-sm transition hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" @click="toggle">
      <img v-if="modelValue!=='all'" :src="`/logos/${modelValue}.svg`" alt="" class="h-7 w-7 shrink-0 object-contain" /><span v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">Все</span>
      <span :id="`${id}-value`" class="min-w-0 flex-1 truncate">{{ selected.name }}</span><span class="text-slate-400" aria-hidden="true">{{ open?'⌃':'⌄' }}</span>
    </button>
    <div v-if="open" class="absolute left-0 z-50 mt-2 w-full min-w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div class="border-b border-slate-100 p-2"><input ref="searchInput" v-model="search" type="search" aria-label="Поиск команды" placeholder="Название или сокращение…" class="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" /></div>
      <ul :id="`${id}-list`" role="listbox" aria-label="Команды" class="max-h-72 overflow-y-auto p-1.5">
        <li v-for="team in filtered" :key="team.abbr" role="none"><button type="button" role="option" :aria-selected="modelValue===team.abbr" tabindex="-1" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition focus:bg-blue-50 focus:outline-none" :class="modelValue===team.abbr?'bg-blue-50 font-bold text-blue-700':'text-slate-700 hover:bg-slate-50'" @click="choose(team.abbr)"><img v-if="team.abbr!=='all'" :src="`/logos/${team.abbr}.svg`" alt="" class="h-8 w-8 shrink-0 object-contain" /><span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold">Все</span><span class="min-w-0 flex-1"><span class="block">{{ team.name }}</span><small v-if="team.abbr!=='all'" class="text-[10px] text-slate-400">{{ team.abbr }}</small></span><span v-if="modelValue===team.abbr" aria-hidden="true">✓</span></button></li>
        <li v-if="!filtered.length" class="p-4 text-center text-sm text-slate-500">Команда не найдена</li>
      </ul>
    </div>
  </div>
</template>
<script setup lang="ts">
import {computed,nextTick,onMounted,onUnmounted,ref,useId} from 'vue'
const props=defineProps<{modelValue:string;teams:{abbr:string;name:string}[]}>()
const emit=defineEmits<{'update:modelValue':[value:string]}>()
const id=useId(),root=ref<HTMLElement|null>(null),trigger=ref<HTMLButtonElement|null>(null),searchInput=ref<HTMLInputElement|null>(null),open=ref(false),search=ref('')
const all=computed(()=>[{abbr:'all',name:'Все команды'},...props.teams]),selected=computed(()=>all.value.find(t=>t.abbr===props.modelValue)||all.value[0]!)
const filtered=computed(()=>all.value.filter(t=>`${t.name} ${t.abbr}`.toLowerCase().includes(search.value.toLowerCase().trim())))
async function toggle(){open.value=!open.value;search.value='';if(open.value){await nextTick();searchInput.value?.focus()}}
function close(){if(!open.value)return;open.value=false;trigger.value?.focus()}
function choose(value:string){emit('update:modelValue',value);close()}
async function keys(e:KeyboardEvent){
 if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return
 if(e.target===searchInput.value&&['Home','End'].includes(e.key))return
 e.preventDefault()
 if(!open.value){open.value=true;search.value='';await nextTick()}
 const items=[...root.value!.querySelectorAll<HTMLElement>('[role=option]')]
 let index=items.indexOf(document.activeElement as HTMLElement)
 index=e.key==='Home'?0:e.key==='End'?items.length-1:e.key==='ArrowDown'?(index+1)%items.length:index<=0?items.length-1:index-1
 items[index]?.focus()
}
function outside(e:PointerEvent){if(root.value&&!root.value.contains(e.target as Node))open.value=false}
onMounted(()=>document.addEventListener('pointerdown',outside))
onUnmounted(()=>document.removeEventListener('pointerdown',outside))
</script>
