<template>
  <section class="space-y-3 border-t border-slate-200 pt-4">
    <h2 class="text-xl font-black text-slate-900">История в моих составах</h2>
    <p v-if="auth.loading || loading" role="status" class="text-sm text-slate-500">Загружаем составы…</p>
    <p v-else-if="!auth.user" class="text-sm text-slate-500">Войдите в аккаунт, чтобы увидеть свои составы с этим игроком.</p>
    <p v-else-if="error" role="alert" class="text-sm text-rose-700">{{ error }} <button type="button" class="font-bold underline" @click="retry++">Повторить</button></p>
    <p v-else-if="!appearances.length" class="text-sm text-slate-500">Этот игрок пока не входил в ваши закреплённые составы.</p>
    <div v-else class="space-y-2">
      <details v-for="{entry,pick} in appearances" :key="`${entry.week}:${entry.mode}`" class="rounded-xl border border-slate-200 p-3">
        <summary class="cursor-pointer text-sm font-bold text-slate-900">{{ weekLabel(entry.week) }} · {{ modeLabel(entry.mode) }} · {{ points(entry.player_points?.[pick.id] ?? 0) }} оч.</summary>
        <p class="mt-3 text-sm text-slate-600"><strong>Состав</strong> · {{ lineupText(entry) }}</p>
        <RouterLink :to="{path:'/fantasy',query:entry.mode==='legacy' ? {week:entry.week} : {day:entry.week,mode:entry.mode}}" class="my-2 inline-block text-sm font-bold text-blue-700">Открыть состав ↗</RouterLink>
        <FantasyLineupPlayer :player="pick" :total="Number(entry.player_points?.[pick.id] ?? 0)" :period="entry.week" :mode="entry.mode || 'legacy'" :profile-id="entry.user_id" />
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { authFetch } from '../../../../api/authFetch'
import { useAuthStore } from '../../../../stores/auth'
import FantasyLineupPlayer from '../../../Fantasy/FantasyLineupPlayer.vue'
import { points, slots, weekLabel, type Entry } from '../../../Fantasy/types'

const props = defineProps<{ playerId?: string; playerName: string }>()
const auth = useAuthStore()
const history = ref<Entry[]>([])
const loading = ref(false)
const error = ref('')
const retry = ref(0)
const nameKey = (value: string) => value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const appearances = computed(() => history.value.flatMap(entry => {
  const pick = entry.lineup.find(p=>props.playerId ? String(p.id)===props.playerId : nameKey(p.name)===nameKey(props.playerName))
  return pick ? [{entry,pick}] : []
}))
const lineupText = (entry: Entry) => [...entry.lineup].sort((a,b)=>slots.indexOf(a.slot)-slots.indexOf(b.slot)).map(p=>p.name).join(' · ')
const modeLabel = (mode: Entry['mode']) => mode==='balanced' ? 'Баланс-фентези' : mode==='unlimited' ? 'Без ограничений' : 'Недельный состав'

watch([()=>auth.user?.id,retry], async ([id],_,onCleanup) => {
  const controller = new AbortController()
  onCleanup(()=>controller.abort())
  history.value = []
  error.value = ''
  loading.value = Boolean(id)
  if (!id) return
  try {
    const data: {history: Entry[]} = await authFetch(`/api/fantasy/profiles/${id}`,{signal:controller.signal})
    if (!controller.signal.aborted) history.value = data.history
  } catch {
    if (!controller.signal.aborted) error.value = 'Не удалось загрузить историю составов.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
},{immediate:true})
</script>
