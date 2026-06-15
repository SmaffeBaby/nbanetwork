<template>
  <div class="space-y-4">

    <div class="text-sm text-gray-500">
      Динамика очков: Общее / Дома / Выезд
    </div>

    <div class="bg-white p-3 rounded-xl shadow sm:p-4">
      <div class="h-60 relative sm:h-72">
        <canvas ref="chartRef" class="w-full h-full"></canvas>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useTeamsPointsTrendTable } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamsPointsTrendTable'

const props = defineProps<{
  teamId: number
  season: string
  seasonType: 'regular' | 'playoffs'
}>()

const teamIdRef = toRef(props, 'teamId')
const seasonRef = toRef(props, 'season')
const seasonTypeRef = toRef(props, 'seasonType')

const { chartRef } =
    useTeamsPointsTrendTable(teamIdRef, seasonRef, seasonTypeRef)
</script>
