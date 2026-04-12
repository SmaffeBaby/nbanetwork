<template>
  <div class="space-y-6">

    <div v-if="loading">Loading game...</div>

    <div v-else-if="error" class="text-red-500">
      {{ error }}
    </div>

    <div v-else class="space-y-6">

      <div class="p-6 border rounded-xl flex items-center justify-between">

        <div class="flex flex-col items-center w-1/3">
          <img
              :src="getTeamLogo(game?.home?.abbr)"
              class="w-14 h-14"
          />
          <div class="font-bold mt-2">
            {{ game?.home?.name }}
          </div>
        </div>

        <div class="text-center">
          <div class="text-3xl font-bold">
            {{ game?.home?.score }} - {{ game?.away?.score }}
          </div>

          <div class="text-sm text-gray-500">
            {{ game?.status }}
          </div>
        </div>

        <div class="flex flex-col items-center w-1/3">
          <img
              :src="getTeamLogo(game?.away?.abbr)"
              class="w-14 h-14"
          />
          <div class="font-bold mt-2">
            {{ game?.away?.name }}
          </div>
        </div>

      </div>

      <div class="p-4 border rounded text-xs overflow-auto bg-gray-50">
        <pre>{{ game }}</pre>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { useGameFinal } from '../../../composables/NBA/GameFinal/useGameFinal'
import { getTeamLogo } from '../../../utils/getTeamLogo'

const { game, loading, error } = useGameFinal()
</script>