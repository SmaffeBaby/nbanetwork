<template>
  <div class="space-y-4">

    <div class="text-sm text-gray-500">
      Динамика очков: Общее / Дома / Выезд
    </div>

    <div class="bg-white p-4 rounded-xl shadow">
      <div class="h-72">
        <canvas ref="chartRef"></canvas>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useTeamsPointsTrendTable } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamsPointsTrendTable'

const props = defineProps<{
  teamId: number
  season: string
}>()

const {
  chartRef,
  init
} = useTeamsPointsTrendTable(props.teamId, props.season)

onMounted(init)

watch(() => props.teamId, init)
</script>