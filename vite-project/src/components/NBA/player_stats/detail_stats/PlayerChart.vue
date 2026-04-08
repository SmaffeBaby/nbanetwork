<template>
  <div>
    <canvas v-if="!loading" ref="canvas"></canvas>
    <div v-else class="text-center text-gray-500">Loading chart...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, toRef } from 'vue'
import Chart from 'chart.js/auto'
import { usePlayerChart } from '../../../../composables/NBA/player_stats/usePlayerChart'

const props = defineProps<{ playerId: number; season: string; team?: string }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const { fetchGames, loading, chartData } = usePlayerChart(
    props.playerId,
    props.season,
    toRef(props, 'team')
)

function renderChart() {
  if (!canvas.value) return
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
}

onMounted(async () => {
  await fetchGames()
  renderChart()
})

watch(chartData, () => {
  renderChart()
})
</script>