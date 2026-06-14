<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-2xl font-black text-gray-900">
          Payroll
        </h2>
        <p class="mt-1 text-sm font-medium text-gray-500">
          {{ teamAbbr }} контракты из источника {{ sourceLabel }}
        </p>
        <p
            v-if="contracts?.sourceStatus === 'fallback'"
            class="mt-2 inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"
        >
          Источник временно недоступен, показана резервная копия
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-3 w-3 rounded bg-blue-600"></span>
            Player Option
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-3 w-3 rounded bg-green-600"></span>
            Team Option
          </span>
        </div>

        <select
            v-model="selectedYear"
            class="min-h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm"
        >
          <option v-for="year in contracts?.years || []" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>
    </div>

    <div
        v-if="contracts && playersForYear.length"
        class="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="text-sm font-bold text-gray-600">
        Масштаб зарплат
      </div>
      <div class="flex items-center gap-3">
        <input
            v-model.number="salaryScale"
            type="range"
            min="0.8"
            max="1.8"
            step="0.1"
            class="w-full accent-blue-600 sm:w-56"
        >
        <span class="w-12 text-right text-sm font-black text-gray-800">{{ salaryScale.toFixed(1) }}x</span>
      </div>
    </div>

    <div v-if="loading" class="rounded-xl bg-white p-6 text-center text-sm font-medium text-gray-500 shadow-sm">
      Загружаем контракты...
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
      {{ error }}
    </div>

    <template v-else-if="contracts && playersForYear.length">
      <div class="rounded-xl bg-white shadow-sm">
        <div class="grid gap-4 p-3 lg:grid-cols-[minmax(320px,1fr)_280px] lg:gap-5 lg:p-6">
          <div class="overflow-visible pr-0">
            <div class="grid w-full min-w-0 grid-cols-[70px_minmax(0,1fr)] sm:grid-cols-[88px_minmax(0,1fr)] lg:grid-cols-[96px_minmax(320px,1fr)]">
            <div class="relative" :style="{ height: `${chartHeight}px` }">
              <div
                  v-for="tick in axisTicks"
                  :key="tick.value"
                  class="absolute right-0 flex w-full items-center justify-end pr-1 text-[10px] font-semibold text-gray-500 sm:pr-2 sm:text-[11px]"
                  :style="{ bottom: `${tick.bottom}px` }"
              >
                {{ formatMoney(tick.value) }}
              </div>
            </div>

            <div class="relative border-b-4 border-gray-950" :style="{ height: `${chartHeight}px` }">
              <div
                  v-for="tick in axisTicks"
                  :key="`grid-${tick.value}`"
                  class="absolute left-0 right-0 border-t border-gray-200"
                  :style="{ bottom: `${tick.bottom}px` }"
              />

              <div
                  v-for="line in capLinePositions"
                  :key="line.key"
                  class="pointer-events-none absolute left-0 right-0 z-[1] border-t-[3px] border-dashed"
                  :style="{ bottom: `${line.bottom}px`, borderColor: line.color }"
              >
                <span
                    class="absolute right-2 top-[-22px] rounded bg-white/95 px-1.5 text-[10px] font-black shadow-sm"
                    :style="{ color: line.color }"
                >
                  {{ line.label }}
                </span>
              </div>

              <RouterLink
                  v-for="segment in stackSegments"
                  :key="segment.player.name"
                  :to="`/player/${encodeURIComponent(segment.player.name)}`"
                  class="absolute left-[4%] right-[4%] z-20 overflow-hidden rounded-md px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-black/5 transition hover:z-30 hover:scale-[1.015] hover:shadow-lg sm:left-[12%] sm:right-[12%] sm:px-3 lg:left-[16%] lg:right-[16%]"
                  :style="{
                    bottom: `${segment.bottom}px`,
                    height: `${segment.height}px`,
                    backgroundColor: segment.color
                  }"
              >
                <div class="flex h-full min-w-0 items-center gap-2">
                  <img
                      v-if="segment.image"
                      :src="segment.image"
                      :alt="segment.player.name"
                      class="shrink-0 rounded-full object-cover shadow-md ring-2 ring-white/70"
                      :class="segment.small ? 'h-7 w-7' : 'h-10 w-10'"
                      @error="hideBrokenImage"
                  >
                  <div class="min-w-0">
                    <div
                        class="truncate font-black leading-tight"
                        :class="segment.small ? 'text-xs' : segment.height < 58 ? 'text-sm' : 'text-xl'"
                    >
                      {{ segment.player.name }}
                    </div>
                    <div
                        class="truncate font-bold"
                        :class="segment.small ? 'text-[11px]' : 'text-xs'"
                    >
                      {{ formatMoney(segment.player.salary) }}
                    </div>
                    <div v-if="segment.player.option && !segment.small" class="mt-1 inline-flex rounded bg-white/25 px-1.5 py-0.5 text-[10px] font-black uppercase">
                      {{ segment.player.option === 'player' ? 'Player Option' : 'Team Option' }}
                    </div>
                  </div>
                </div>
              </RouterLink>
            </div>
          </div>
        </div>

        <aside class="space-y-3">
          <div class="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div class="text-xs font-bold uppercase text-gray-500">
              Team Total
            </div>
            <div class="mt-1 text-xl font-black text-gray-950 sm:text-2xl">
              {{ formatMoney(totalSalary) }}
            </div>
            <div class="text-sm font-semibold text-gray-500">
              {{ selectedYear }}
            </div>
          </div>

          <SalaryCapRulesList
              :lines="capLines"
              :format-money="formatMoney"
          />

          <a
              :href="contracts.source"
              target="_blank"
              rel="noreferrer"
              class="inline-flex w-full items-center justify-center rounded-lg bg-gray-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            {{ sourceLabel }}
          </a>
        </aside>
      </div>
    </div>

      <TeamContractsTable
          :contracts="contracts"
          :format-money="formatMoney"
      />
    </template>

    <div v-else class="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500">
      Нет контрактов для выбранного сезона.
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { RouterLink } from 'vue-router'
import { useTeamContracts } from '../../../composables/NBA/Contracts/useTeamContracts'
import SalaryCapRulesList from './SalaryCapRulesList.vue'
import TeamContractsTable from './TeamContractsTable.vue'

const props = defineProps<{
  teamAbbr: string
}>()

const {
  contracts,
  selectedYear,
  loading,
  error,
  playersForYear,
  totalSalary,
  capLines,
  chartMax,
  formatMoney,
  getPlayerImage,
  getSegmentColor
} = useTeamContracts(toRef(props, 'teamAbbr'))

const salaryScale = ref(typeof window !== 'undefined' && window.innerWidth < 640 ? 0.8 : 1)

const sourceLabel = computed(() => {
  if (contracts.value?.sourceStatus === 'hoopshype') return 'Hoopshype'
  if (contracts.value?.sourceStatus === 'fallback') return 'local fallback'

  return 'Hoopshype'
})

const valueToPx = (value: number) => {
  const moneyHeight = 720 * salaryScale.value
  return chartMax.value ? (value / chartMax.value) * moneyHeight : 0
}

const valueToVisualPx = (value: number) => {
  let moneyBottom = 0
  let visualOffset = 0

  for (const player of [...playersForYear.value].reverse()) {
    const proportionalHeight = valueToPx(player.salary)
    const extraHeight = Math.max(42 - proportionalHeight, 0)
    const moneyTop = moneyBottom + player.salary

    if (value <= moneyTop) {
      const insideSalary = Math.max(value - moneyBottom, 0)
      const segmentRatio = player.salary ? insideSalary / player.salary : 0
      return valueToPx(value) + visualOffset + extraHeight * segmentRatio
    }

    moneyBottom = moneyTop
    visualOffset += extraHeight
  }

  return valueToPx(value) + visualOffset
}

const chartHeight = computed(() => {
  return Math.max(720, valueToVisualPx(chartMax.value) + 80)
})

const stackSegments = computed(() => {
  let moneyBottom = 0
  let visualOffset = 0

  return [...playersForYear.value].reverse().map((player, index) => {
    const proportionalHeight = valueToPx(player.salary)
    const height = Math.max(proportionalHeight, 42)
    const addedHeight = Math.max(height - proportionalHeight, 0)
    const segment = {
      player,
      bottom: valueToPx(moneyBottom) + visualOffset,
      height,
      small: height < 58,
      color: getSegmentColor(index, player.option),
      image: getPlayerImage(player.nbaPlayerId, player.bbrefSlug)
    }

    moneyBottom += player.salary
    visualOffset += addedHeight

    return segment
  })
})

const capLinePositions = computed(() =>
    capLines.value.map(line => ({
      ...line,
      bottom: Math.min(valueToVisualPx(line.value), chartHeight.value)
    }))
)

const axisTicks = computed(() => {
  const max = chartMax.value || 0
  if (!max) return []

  const step = 10_000_000
  const top = Math.ceil(max / step) * step
  const ticks = []

  for (let value = 0; value <= top; value += step) {
    ticks.push({
      value,
      bottom: Math.min(valueToVisualPx(value), chartHeight.value)
    })
  }

  return ticks
})

const hideBrokenImage = (event: Event) => {
  const image = event.target as HTMLImageElement
  image.style.display = 'none'
}
</script>
