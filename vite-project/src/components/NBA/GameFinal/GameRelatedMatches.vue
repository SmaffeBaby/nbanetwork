<template>
  <div class="mt-8 space-y-8 border-t border-slate-200 pt-8">
    <p v-if="query.isPending.value" role="status" class="text-sm text-slate-500">Загружаем последние матчи команд и игры этого дня…</p>
    <p v-else-if="query.isError.value" role="alert" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Не удалось загрузить связанные матчи. <button class="font-bold underline" @click="query.refetch()">Повторить</button></p>
    <template v-else-if="query.data.value">
      <GameMatchesSlider title="Последние матчи" subtitle="Три предыдущие игры каждой команды до этого матча" :games="selected?.games || []" :error="selected?.error" empty-text="Предыдущих матчей команды пока нет." @retry="query.refetch()">
        <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Команда для последних матчей"><button v-for="(group, index) in query.data.value.recent" :key="group.team.id" type="button" :aria-pressed="active === index" class="flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition" :class="active === index ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'" @click="active = index"><img :src="`/logos/${group.team.abbr}.svg`" alt="" class="h-6 w-6 object-contain" />{{ group.team.name }}</button></div>
      </GameMatchesSlider>
      <GameMatchesSlider :title="`Другие матчи · ${day}`" :games="query.data.value.sameDay.games" :error="query.data.value.sameDay.error" empty-text="В этот день других матчей нет." @retry="query.refetch()" />
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import GameMatchesSlider from './GameMatchesSlider.vue'
import type { RelatedMatches } from './analysisTypes'
const props = defineProps<{ gameId: string }>()
const active = ref(0)
const query = useQuery({
  queryKey: computed(() => ['game-related', props.gameId]),
  queryFn: async ({ queryKey: [, id], signal }): Promise<RelatedMatches> => {
    const response = await fetch(`/api/game-related/${encodeURIComponent(String(id))}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]) })
    if (!response.ok) throw new Error('Связанные матчи недоступны')
    return response.json()
  }, staleTime: 60000, retry: 1
})
const selected = computed(() => query.data.value?.recent[active.value])
const day = computed(() => query.data.value?.date ? new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${query.data.value.date}T12:00:00Z`)) : '')
</script>
