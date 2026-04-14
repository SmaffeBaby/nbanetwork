<template>
  <div class="space-y-6">

    <GameHeader
        :game="game"
        :loading="loading"
        :error="error"
    />

    <TabsContent>
      <template #overview>
        <GameRecapCard
            v-if="recap"
            :recap="recap"
        />
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
import { useGameFinal } from '../../../composables/NBA/GameFinal/useGameFinal'
import GameHeader from './GameHeader.vue'
import GameRecapCard from './GameRecapCard.vue'
import TabsContent from './TabsContent.vue'

const { game, recap, loading, error } = useGameFinal()
</script>