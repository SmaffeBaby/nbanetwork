<template>
  <div>
    <canvas v-if="!loading" ref="canvas"></canvas>
    <div v-else class="text-center text-gray-500">Loading chart...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import Chart from 'chart.js/auto'
import { usePlayerGameLog } from '../../../composables/NBA/player_stats/usePlayerGameLog'

const props = defineProps<{ playerId: number; season: string }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const { chartData, fetchGames, loading, games } = usePlayerGameLog(
    props.playerId,
    props.season
)

onMounted(async () => {
  await fetchGames()

  if (games.value.length && canvas.value) {
    chart = new Chart(canvas.value, {
      type: 'line',
      data: chartData.value,
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { x: { display: true }, y: { beginAtZero: true } }
      }
    })
  }
})

watch(games, (newGames) => {
  if (!canvas.value || !newGames.length) return
  if (chart) chart.destroy()

  chart = new Chart(canvas.value, {
    type: 'line',
    data: chartData.value,
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { x: { display: true }, y: { beginAtZero: true } }
    }
  })
})
</script>