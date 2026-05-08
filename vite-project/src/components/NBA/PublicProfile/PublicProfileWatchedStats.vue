<template>
  <section class="space-y-5 rounded-2xl bg-white p-6 shadow-md">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-2xl font-black text-gray-900">Статистика просмотров</h2>
        <p class="mt-1 text-sm font-medium text-gray-500">
          {{ filteredGames.length }} из {{ games.length }} просмотренных матчей
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <PublicProfileProgressEditor
            v-if="auth.user?.isAdmin"
            :rules="rules"
            :saving="saving"
            :error="rulesError"
            :save-rule="saveRule"
            :delete-rule="deleteRule"
        />

        <label class="flex flex-col gap-1 text-xs font-semibold uppercase text-gray-500">
          Сезон
          <select
              v-model="selectedSeason"
              class="min-h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Все сезоны</option>
            <option
                v-for="season in seasons"
                :key="season"
                :value="season"
            >
              {{ season }}
            </option>
          </select>
        </label>

        <div class="inline-flex rounded-xl bg-gray-100 p-1">
          <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-bold transition"
              :class="activeTab === tab.value ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
              @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="games.length" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div class="min-h-[300px]">
        <canvas ref="canvas" class="h-[300px] w-full"></canvas>
      </div>

      <aside class="space-y-3">
        <div class="rounded-xl bg-gray-50 p-4">
          <div class="text-xs font-semibold uppercase text-gray-500">Всего</div>
          <div class="mt-1 text-3xl font-black text-gray-900">{{ filteredGames.length }}</div>
        </div>

        <div class="rounded-xl bg-gray-50 p-4">
          <div class="text-xs font-semibold uppercase text-gray-500">Самая частая команда</div>
          <div v-if="topTeam" class="mt-3 flex items-center gap-3">
            <img
                :src="getTeamLogo(topTeam.abbr)"
                :alt="topTeam.abbr"
                class="h-10 w-10 object-contain"
            >
            <div class="min-w-0">
              <div class="truncate text-sm font-black text-gray-900">
                {{ topTeam.name }}
              </div>
              <div class="text-sm font-semibold text-gray-500">
                {{ topTeam.count }} матчей
              </div>
            </div>
          </div>
          <div v-else class="mt-2 text-sm text-gray-500">Нет данных</div>
        </div>
      </aside>
    </div>

    <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-sm text-gray-500"
    >
      Пользователь пока не отметил просмотренные матчи.
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import type { FavoriteGame } from '../../../stores/auth'
import { useAuthStore } from '../../../stores/auth'
import { getTeamLogo } from '../../../utils/getTeamLogo'
import PublicProfileProgressEditor from './PublicProfileProgressEditor.vue'
import type {
  ProfileProgressRule,
  ProfileProgressRulePayload
} from '../../../composables/NBA/PublicProfile/useProfileProgressRules'

const props = defineProps<{
  games: FavoriteGame[]
  rules: ProfileProgressRule[]
  savingProgressRule: boolean
  progressRuleError: string | null
  saveProgressRule: (payload: ProfileProgressRulePayload) => Promise<boolean>
  deleteProgressRule: (id: string) => Promise<boolean>
}>()

const tabs = [
  { value: 'timeline', label: 'Динамика' },
  { value: 'teams', label: 'Команды' }
] as const

type TabValue = typeof tabs[number]['value']

const canvas = ref<HTMLCanvasElement | null>(null)
const selectedSeason = ref('all')
const activeTab = ref<TabValue>('timeline')
let chart: Chart | null = null
const auth = useAuthStore()
const rules = computed(() => props.rules)
const saving = computed(() => props.savingProgressRule)
const rulesError = computed(() => props.progressRuleError)
const saveRule = props.saveProgressRule
const deleteRule = props.deleteProgressRule

const toDate = (date: string | null | undefined) => {
  if (!date) return null

  const trimmedDate = date.trim()
  const dotMatch = trimmedDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (dotMatch) {
    const [, day, month, year] = dotMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const slashMatch = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const isoMatch = trimmedDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return null
}

const getSeason = (game: FavoriteGame) => {
  const date = toDate(game.date)
  if (!date) return null

  const startYear = date.getMonth() >= 9 ? date.getFullYear() : date.getFullYear() - 1
  return `${startYear}-${String(startYear + 1).slice(-2)}`
}

const seasons = computed(() =>
  Array.from(
    new Set(
      props.games
        .map(getSeason)
        .filter((season): season is string => Boolean(season))
    )
  ).sort((a, b) => b.localeCompare(a))
)

const filteredGames = computed(() => {
  if (selectedSeason.value === 'all') return props.games

  return props.games.filter(game => getSeason(game) === selectedSeason.value)
})

const timelineData = computed(() => {
  const months = new Map<string, { label: string, count: number }>()

  filteredGames.value.forEach((game) => {
    const date = toDate(game.date)
    if (!date) return

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('ru-RU', {
      month: 'short',
      year: '2-digit'
    }).format(date)

    months.set(key, {
      label,
      count: (months.get(key)?.count ?? 0) + 1
    })
  })

  return [...months.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([, value]) => value)
})

const teamData = computed(() => {
  const teams = new Map<string, { abbr: string, name: string, count: number }>()

  filteredGames.value.forEach((game) => {
    ;[
      { abbr: game.awayAbbr, name: game.awayName || game.awayAbbr },
      { abbr: game.homeAbbr, name: game.homeName || game.homeAbbr }
    ].forEach((team) => {
      if (!team.abbr) return

      teams.set(team.abbr, {
        ...team,
        count: (teams.get(team.abbr)?.count ?? 0) + 1
      })
    })
  })

  return [...teams.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const topTeam = computed(() => teamData.value[0] ?? null)

const renderChart = async () => {
  await nextTick()
  if (!canvas.value) return

  if (chart) {
    chart.destroy()
    chart = null
  }

  const isTeamsTab = activeTab.value === 'teams'
  const labels = isTeamsTab
    ? teamData.value.slice(0, 10).map(team => team.abbr)
    : timelineData.value.map(item => item.label)
  const data = isTeamsTab
    ? teamData.value.slice(0, 10).map(team => team.count)
    : timelineData.value.map(item => item.count)

  chart = new Chart(canvas.value, {
    type: isTeamsTab ? 'bar' : 'line',
    data: {
      labels,
      datasets: [{
        label: isTeamsTab ? 'Матчи команды' : 'Просмотренные матчи',
        data,
        borderColor: '#2563eb',
        backgroundColor: isTeamsTab ? '#dc2626' : 'rgba(37, 99, 235, 0.16)',
        borderWidth: 3,
        fill: !isTeamsTab,
        tension: 0.35,
        pointRadius: 4,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isTeamsTab ? 'y' : 'x',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${isTeamsTab ? context.parsed.x : context.parsed.y} матчей`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.18)' }
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: 'rgba(148, 163, 184, 0.18)' }
        }
      }
    }
  })
}

watch(
  () => [filteredGames.value.length, selectedSeason.value, activeTab.value, teamData.value.length, timelineData.value.length],
  renderChart,
  { deep: true }
)

watch(seasons, () => {
  if (selectedSeason.value !== 'all' && !seasons.value.includes(selectedSeason.value)) {
    selectedSeason.value = 'all'
  }
})

onMounted(() => {
  void renderChart()
})

onBeforeUnmount(() => {
  chart?.destroy()
})
</script>
