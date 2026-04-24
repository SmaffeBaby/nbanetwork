<template>
  <div>
    <canvas v-if="!loading" ref="canvas"></canvas>
    <div v-else class="text-center text-gray-500">Loading chart...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, toRef, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import { usePlayerChart } from '../../../../composables/NBA/player_stats/usePlayerChart'

const props = defineProps<{
  playerId: number
  season: string
  team?: string
  seasonType?: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const { loading, chartData } = usePlayerChart(
    props.playerId,
    toRef(props, 'season'),
    toRef(props, 'team'),
    toRef(props, 'seasonType')
)

function renderChart() {
  if (!canvas.value) return

  if (chart) {
    chart.destroy()
    chart = null
  }

  chart = new Chart(canvas.value, {
    type: 'line',
    data: chartData.value,
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        x: { display: true },
        y: { beginAtZero: true }
      }
    }
  })
}


watch(
    () => chartData.value,
    async () => {
      await nextTick()
      renderChart()
    },
    { deep: true }
)
</script>