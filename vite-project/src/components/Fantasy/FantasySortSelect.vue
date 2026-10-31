<template>
  <div ref="root" class="relative w-full min-w-0 sm:w-64" @keydown.esc.stop="close" @keydown="navigate">
    <p :id="`${id}-label`" class="mb-1 text-xs font-semibold uppercase text-slate-500">Сортировка</p>
    <button ref="trigger" type="button" role="combobox" aria-haspopup="listbox" :aria-expanded="open" :aria-controls="`${id}-options`" :aria-labelledby="`${id}-label ${id}-value`" class="flex min-h-12 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" @click="toggle"><span class="rounded-lg bg-indigo-50 px-2 py-1 text-indigo-600" aria-hidden="true">⇅</span><span :id="`${id}-value`" class="min-w-0 flex-1 truncate">{{ selected?.label }}</span><span class="text-slate-400" aria-hidden="true">⌄</span></button>
    <ul v-if="open" :id="`${id}-options`" role="listbox" aria-label="Сортировка игроков" class="absolute left-0 z-50 mt-2 w-full min-w-[240px] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"><li v-for="option in options" :key="option.value" role="none"><button type="button" role="option" :aria-selected="modelValue===option.value" tabindex="-1" class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition focus:bg-blue-50 focus:outline-none" :class="modelValue===option.value?'bg-blue-50 font-bold text-blue-700':'text-slate-600 hover:bg-slate-50'" @click="select(option.value)"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500" aria-hidden="true">{{ option.icon }}</span><span class="flex-1">{{ option.label }}</span><span v-if="modelValue===option.value" aria-hidden="true">✓</span></button></li></ul>
  </div>
</template>
<script setup lang="ts">
import {computed,nextTick,onMounted,onUnmounted,ref,useId} from 'vue'
const props=defineProps<{modelValue:string}>(),emit=defineEmits<{'update:modelValue':[value:string]}>()
const options=[{value:'ovr',label:'Сначала выше OVR',icon:'↓'},{value:'budget',label:'Сначала ниже OVR',icon:'↑'},{value:'popular',label:'Популярные среди игроков',icon:'★'},{value:'name',label:'По имени',icon:'А'}]
const selected=computed(()=>options.find(p=>p.value===props.modelValue)),id=useId(),open=ref(false),root=ref<HTMLElement|null>(null),trigger=ref<HTMLButtonElement|null>(null)
async function toggle(){open.value=!open.value;if(open.value){await nextTick();const index=options.findIndex(p=>p.value===props.modelValue);root.value?.querySelectorAll<HTMLElement>('[role=option]')[index]?.focus()}}
function close(){open.value=false;trigger.value?.focus()}
function select(value:string){emit('update:modelValue',value);close()}
async function navigate(e:KeyboardEvent){if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();if(!open.value){open.value=true;await nextTick()};const nodes=[...root.value!.querySelectorAll<HTMLElement>('[role=option]')];let i=nodes.indexOf(document.activeElement as HTMLElement);i=e.key==='Home'?0:e.key==='End'?nodes.length-1:e.key==='ArrowDown'?(i+1)%nodes.length:i<=0?nodes.length-1:i-1;nodes[i]?.focus()}
function outside(e:PointerEvent){if(root.value&&!root.value.contains(e.target as Node))open.value=false}
onMounted(()=>document.addEventListener('pointerdown',outside));onUnmounted(()=>document.removeEventListener('pointerdown',outside))
</script>
