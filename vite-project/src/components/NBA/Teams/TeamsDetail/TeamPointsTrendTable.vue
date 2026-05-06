<template>
  <div class="space-y-4">

    <div class="text-sm text-gray-500">
      Динамика очков: Общее / Дома / Выезд
    </div>

    <div class="bg-white p-4 rounded-xl shadow">
      <div class="h-72 relative">
        <canvas ref="chartRef" class="w-full h-full"></canvas>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { watch, toRef } from 'vue'
import { useTeamsPointsTrendTable } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamsPointsTrendTable'

const props = defineProps<{
  teamId: number
  season: string
  seasonType: 'regular' | 'playoffs'
}>()

const seasonRef = toRef(props, 'season')
const seasonTypeRef = toRef(props, 'seasonType')

const { chartRef, fetchGames } =
    useTeamsPointsTrendTable(props.teamId, seasonRef, seasonTypeRef)

watch(
    () => props.teamId,
    () => {
      fetchGames()
    }
)
</script>