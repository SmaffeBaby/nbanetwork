<template>
  <div class="player-chart">
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
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 34,
            padding: 12
          }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            autoSkip: false,
            callback(value, index, ticks) {
              const maxLabels = window.innerWidth < 640 ? 3 : 6
              const step = Math.max(1, Math.ceil(ticks.length / maxLabels))

              if (index % step !== 0) return ''
              return this.getLabelForValue(Number(value))
            },
            maxRotation: 0,
            minRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            maxTicksLimit: 5
          }
        }
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

<style scoped>
.player-chart {
  height: 260px;
  min-width: 0;
  position: relative;
  width: 100%;
}

.player-chart canvas {
  max-width: 100%;
}

@media (max-width: 640px) {
  .player-chart {
    height: 230px;
  }
}
</style>
