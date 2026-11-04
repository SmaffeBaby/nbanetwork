<template>
  <section class="space-y-5 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
    <h2 class="text-xl font-black text-slate-900">Награды и титулы</h2>
    <p v-if="loading" role="status" class="text-sm text-slate-500">Загружаем награды…</p>
    <p v-else-if="error" role="alert" class="text-sm text-rose-700">{{ error }} <button type="button" class="font-bold underline" @click="retry++">Повторить</button></p>
    <template v-else>
      <div>
        <h3 class="flex items-center gap-2 font-extrabold text-slate-900"><TrophyIcon class="h-5 w-5 text-amber-600" aria-hidden="true" /> Чемпионские титулы НБА · {{ championships.length }}</h3>
        <ul v-if="championships.length" class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="title in championships" :key="awardKey(title)" class="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <TrophyIcon class="h-8 w-8 shrink-0 text-amber-600" aria-hidden="true" />
            <div><strong class="block text-slate-900">{{ title.season }}</strong><span v-if="title.team" class="text-sm text-slate-700">{{ title.team }}</span></div>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-slate-500">Чемпионских титулов НБА нет.</p>
      </div>
      <div>
        <h3 class="font-extrabold text-slate-900">Индивидуальные награды и достижения</h3>
        <div v-if="groups.length" class="mt-3 grid items-start gap-2 sm:grid-cols-2">
          <details v-for="[name,items] in groups" :key="name" class="rounded-xl border border-slate-200 p-3">
            <summary class="cursor-pointer text-sm font-bold text-slate-800">{{ labels[name] || name }} <span class="ml-1 text-blue-700">×{{ items.length }}</span></summary>
            <ul class="mt-2 divide-y divide-slate-100">
              <li v-for="item in items" :key="awardKey(item)" class="py-2 text-xs text-slate-600">
                <strong class="text-slate-900">{{ item.season || 'Сезон не указан' }}</strong>
                <span v-if="item.team"> · {{ item.team }}</span>
                <span v-if="item.selection"> · Сборная №{{ item.selection }}</span>
                <span v-if="item.month"> · {{ item.month }}</span>
                <span v-if="item.week"> · {{ item.week }}</span>
              </li>
            </ul>
          </details>
        </div>
        <p v-else class="mt-2 text-sm text-slate-500">В базе пока нет индивидуальных наград игрока.</p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { TrophyIcon } from '@heroicons/vue/24/solid'

type Award = {name:string;season:string|null;team:string|null;selection:string|null;month:string|number|null;week:string|number|null;championship:boolean}
const props = defineProps<{ playerName: string }>()
const awards = ref<Award[]>([])
const loading = ref(true)
const error = ref('')
const retry = ref(0)
const labels: Record<string,string> = {
  'NBA Most Valuable Player':'MVP регулярного сезона',
  'NBA Finals Most Valuable Player':'MVP финала НБА',
  'NBA All-Star Most Valuable Player':'MVP Матча всех звёзд',
  'NBA Rookie of the Year':'Новичок года',
  'NBA Defensive Player of the Year':'Защитник года',
  'NBA Sixth Man of the Year':'Лучший шестой игрок',
  'NBA Most Improved Player':'Самый прогрессирующий игрок',
  'All-NBA':'Сборная сезона НБА',
  'All-Defensive Team':'Сборная лучших защитников',
  'All-Rookie Team':'Сборная новичков',
  'NBA All-Star':'Матч всех звёзд НБА',
  'Player of the Month':'Игрок месяца',
  'Player of the Week':'Игрок недели'
}
const awardKey = (item: Award) => JSON.stringify([item.name,item.season,item.team,item.selection,item.month,item.week])
const championships = computed(() => awards.value.filter(item=>item.championship))
const groups = computed(() => {
  const byName = new Map<string,Award[]>()
  for (const award of awards.value) {
    if (award.championship) continue
    const items = byName.get(award.name) || []
    items.push(award)
    byName.set(award.name,items)
  }
  return [...byName].sort(([a],[b])=>(labels[a]||a).localeCompare(labels[b]||b,'ru'))
})

watch([()=>props.playerName,retry],async ([name],_,onCleanup)=>{
  const controller = new AbortController()
  onCleanup(()=>controller.abort())
  loading.value = true
  error.value = ''
  awards.value = []
  try {
    const {data} = await axios.get<{awards:Award[]}>(`/api/player-profile/${encodeURIComponent(name)}/awards`,{signal:controller.signal,timeout:25000})
    if (controller.signal.aborted) return
    awards.value = [...new Map(data.awards.map(item=>[awardKey(item),item])).values()]
      .sort((a,b)=>(b.season||'').localeCompare(a.season||''))
  } catch {
    if (!controller.signal.aborted) error.value = 'Не удалось загрузить награды игрока.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
},{immediate:true})
</script>
