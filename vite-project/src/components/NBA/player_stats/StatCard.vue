<template>
  <div class="bg-gray-900 text-white rounded-2xl p-4 shadow">

    <h2 class="text-lg font-semibold mb-3">
      {{ title }}
    </h2>

    <div class="space-y-2">
      <div
          v-for="p in players"
          :key="p.PLAYER_NAME"
          class="flex justify-between border-b border-gray-700 pb-1"
      >
        <span class="truncate">{{ p.PLAYER_NAME }}</span>
        <span class="font-bold">
          {{ p[field] }}
        </span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
type StatKey = 'PTS' | 'REB' | 'AST' | 'STL' | 'BLK' | 'TOV'

interface Player {
  PLAYER_NAME: string
  TEAM_ABBREVIATION: string
  PTS: number
  REB: number
  AST: number
  STL: number
  BLK: number
  TOV: number
}

defineProps<{
  title: string
  stat: string
  players: Player[]
  field: StatKey
}>()
</script>