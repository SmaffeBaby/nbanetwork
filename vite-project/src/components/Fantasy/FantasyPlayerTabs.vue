<template>
  <div role="tablist" :aria-label="label" class="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
    <button v-for="(tab,i) in tabs" :id="`${id}-tab-${tab.id}`" :key="tab.id" type="button" role="tab" :aria-selected="modelValue===tab.id" :aria-controls="`${id}-panel-${tab.id}`" :tabindex="modelValue===tab.id?0:-1" class="shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition" :class="modelValue===tab.id?'bg-white text-blue-700 shadow-sm':'text-slate-500 hover:text-slate-900'" @click="emit('update:modelValue',tab.id)" @keydown="navigate($event,i)">{{ tab.label }}</button>
  </div>
</template>
<script setup lang="ts">
const props=defineProps<{modelValue:string;tabs:{id:string;label:string}[];label:string;id:string}>()
const emit=defineEmits<{'update:modelValue':[value:string]}>()
function navigate(e:KeyboardEvent,i:number){
 const last=props.tabs.length-1
 const n=e.key==='ArrowRight'?(i+1)%(last+1):e.key==='ArrowLeft'?(i+last)%(last+1):e.key==='Home'?0:e.key==='End'?last:-1
 if(n<0)return
 e.preventDefault();emit('update:modelValue',props.tabs[n]!.id)
 const root=(e.currentTarget as HTMLElement).parentElement
 ;(root?.querySelectorAll<HTMLElement>('[role=tab]')[n])?.focus()
}
</script>
