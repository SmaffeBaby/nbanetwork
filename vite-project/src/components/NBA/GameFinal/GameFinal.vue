<template>
  <div class="space-y-6">

    <GameHeader
        :game="game"
        :loading="loading"
        :error="error"
    />

    <button
        @click="$router.back()"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl
               bg-white/10 backdrop-blur-md text-black text-sm font-medium
               border border-white/20 shadow-sm
               hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5
               active:scale-95 transition-all duration-200"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <TabsContent>
      <template #overview>
        <GameRecapCard
            v-if="recap"
            :recap="recap"
        />
      </template>

      <template #players>
        <GamePlayersStats :filters="filters" />
      </template>

      <template #injury>
        <InjuryPlayers :filters="filters"/>
      </template>


      <template #data>
        <div v-if="game" class="p-4 border rounded text-xs overflow-auto bg-gray-50">
          <pre>{{ game }}</pre>
        </div>
      </template>
    </TabsContent>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameFinal } from '../../../composables/NBA/GameFinal/useGameFinal'
import GameHeader from './GameHeader.vue'
import GameRecapCard from './GameRecapCard.vue'
import GamePlayersStats from './BoxScore/GamePlayersStats.vue'
import InjuryPlayers from './Injury/InjuryPlayers.vue'
import TabsContent from './TabsContent.vue'

const filters = ref({
  search: '',
  quarter: null as number | null
})

const { game, recap, loading, error } = useGameFinal(filters)
</script>