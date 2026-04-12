<template>
  <div class="space-y-6">

    <GameHeader
        :game="game"
        :loading="loading"
        :error="error"
    />

    <div v-if="game" class="p-4 border rounded text-xs overflow-auto bg-gray-50">
      <pre>{{ game }}</pre>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useGameFinal } from '../../../composables/NBA/GameFinal/useGameFinal'
import GameHeader from './GameHeader.vue'

const { game, loading, error } = useGameFinal()
</script>