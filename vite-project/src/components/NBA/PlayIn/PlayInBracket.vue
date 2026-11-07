<template>
  <div class="space-y-7">
    <section v-for="conference in conferences" :key="conference.id" class="space-y-4">
      <h2 class="text-xl font-black text-slate-900">{{ conference.label }}</h2>
      <div class="grid gap-4 rounded-3xl border border-slate-200 bg-slate-100/70 p-4 lg:grid-cols-3">
        <PlayInGameCard v-for="slot in slots" :key="slot.id" :game="games.find(g => g.conference === conference.id && g.stage === slot.id)" :label="slot.label" :description="slot.description" :placeholder="slot.placeholder" :hide-scores="hideScores" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import PlayInGameCard from './PlayInGameCard.vue'
import type { PlayInGame } from '../../../types/playIn'
defineProps<{ games: PlayInGame[]; hideScores: boolean }>()
const conferences = [{ id: 'east', label: 'Восточная конференция' }, { id: 'west', label: 'Западная конференция' }]
const slots = [
  { id: 'seventh', label: '7-е против 8-го места', description: 'Победитель → 7-й посев плей-офф. Проигравший получает ещё один шанс.', placeholder: 'Участники определятся по итогам регулярного сезона' },
  { id: 'elimination', label: '9-е против 10-го места', description: 'Победитель → матч за 8-й посев. Проигравший выбывает.', placeholder: 'Участники определятся по итогам регулярного сезона' },
  { id: 'eighth', label: 'Матч за 8-й посев', description: 'Проигравший в паре 7–8 против победителя пары 9–10. Победитель выходит в плей-офф.', placeholder: 'Пара определится после первых двух матчей' }
]
</script>
