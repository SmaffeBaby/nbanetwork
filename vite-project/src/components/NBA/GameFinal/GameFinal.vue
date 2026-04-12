<template>
  <div class="space-y-4">
    <div v-if="loading">Loading game...</div>

    <div v-else-if="error" class="text-red-500">
      {{ error }}
    </div>

    <div v-else>
      <div class="p-4 border rounded">
        <h2 class="text-xl font-bold">
          Game {{ gameId }}
        </h2>

        <pre class="text-xs mt-4 overflow-auto">
{{ game }}
        </pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameFinal } from '../../../composables/NBA/GameFinal/useGameFinal'

const {
  gameId,
  game,
  loading,
  error
} = useGameFinal()
</script>