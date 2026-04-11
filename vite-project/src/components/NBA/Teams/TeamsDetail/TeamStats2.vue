<template>
  <div v-if="loading" class="text-gray-500">
    Загрузка...
  </div>

  <div v-else-if="stats" class="space-y-6">

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard title="Победы" :value="stats.WINS" />
      <StatCard title="Поражения" :value="stats.LOSSES" />
      <StatCard title="Win %" :value="(stats.WinPCT * 100).toFixed(1) + '%'" />
      <StatCard title="Место" :value="stats.PlayoffRank" />
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard title="Очки за игру" :value="stats.PointsPG" />
      <StatCard title="Пропущено" :value="stats.OppPointsPG" />
      <StatCard title="Разница" :value="stats.DiffPointsPG" />
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard title="Дома" :value="stats.HOME" />
      <StatCard title="В гостях" :value="stats.ROAD" />
      <StatCard title="Последние 10" :value="stats.L10" />
    </div>

    <div class="bg-white p-4 rounded-xl shadow">
      <div class="h-64">
        <canvas ref="chartRef"></canvas>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import Chart from 'chart.js/auto'
import { useTeamStats2 } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamStats2'
import StatCard from './StatCard.vue'

const props = defineProps<{
  teamId: number
}>()

const { stats, loading } = useTeamStats2(props.teamId, '2025-26')

const chartRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const renderChart = () => {
  if (!chartRef.value || !stats.value) return

  if (chart) {
    chart.destroy()
    chart = null
  }

  const ctx = chartRef.value.getContext('2d')
  if (!ctx) return

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Очки', 'Пропущено', 'Разница'],
      datasets: [
        {
          label: 'Статистика команды',
          data: [
            Number(stats.value.PointsPG ?? 0),
            Number(stats.value.OppPointsPG ?? 0),
            Number(stats.value.DiffPointsPG ?? 0)
          ]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  })
}

watch(stats, async () => {
  await nextTick()
  renderChart()
}, { immediate: true })

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy()
    chart = null
  }
})
</script>