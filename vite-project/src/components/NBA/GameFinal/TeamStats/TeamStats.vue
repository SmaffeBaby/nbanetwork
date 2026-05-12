<template>
  <div class="mx-auto grid max-w-6xl gap-5">
    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-4 border-b border-gray-200 pb-3">
        <h2 class="text-2xl font-black uppercase leading-none tracking-normal text-gray-950 sm:text-3xl">
          Высшие показатели
        </h2>
      </div>

      <div v-if="leaderRows.length" class="grid gap-4 md:grid-cols-2">
        <article
            v-for="row in leaderRows"
            :key="row.key"
            class="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <span class="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-black text-white">
              {{ row.label }}
            </span>
            <strong class="truncate text-xs font-extrabold uppercase text-gray-600">
              {{ row.title }}
            </strong>
          </div>

          <div class="grid gap-3">
            <div
                v-for="leader in row.leaders"
                :key="leader.key"
                class="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div class="grid grid-cols-[46px_minmax(0,1fr)_auto] items-center gap-3">
                <router-link
                    :to="{ name: 'PlayerPage', params: { name: encodeURIComponent(leader.player.name) } }"
                    class="rounded-full transition hover:scale-105"
                >
                  <img
                      :src="getPlayerImage({ PLAYER_ID: leader.player.PLAYER_ID })"
                      :data-player-id="leader.player.PLAYER_ID"
                      @error="handleImageError"
                      :style="{ borderColor: leader.color }"
                      class="h-11 w-11 rounded-full border-[3px] bg-gray-100 object-cover"
                      alt=""
                  />
                </router-link>

                <div class="min-w-0">
                  <router-link
                      :to="{ name: 'PlayerPage', params: { name: encodeURIComponent(leader.player.name) } }"
                      class="block truncate text-sm font-extrabold leading-tight text-gray-950 hover:underline"
                  >
                    {{ leader.player.name }}
                  </router-link>
                  <div class="text-[11px] font-black leading-tight" :style="{ color: leader.color }">
                    {{ leader.abbr }}
                  </div>
                </div>

                <div class="text-3xl font-black leading-none" :style="{ color: leader.color }">
                  {{ formatNumber(leader.value) }}
                </div>
              </div>

              <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                    class="h-full rounded-full"
                    :style="{ width: `${leader.percent}%`, backgroundColor: leader.color }"
                ></div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
        Нет данных по игрокам для этой игры.
      </div>
    </section>

    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-4 border-b border-gray-200 pb-3">
        <h2 class="text-2xl font-black uppercase leading-none tracking-normal text-gray-950 sm:text-3xl">
          Командная статистика
        </h2>
      </div>

      <div class="mb-4 grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <router-link
            :to="{ name: 'TeamDetail', params: { abbr: awayAbbr } }"
            class="flex min-w-0 items-center justify-center gap-3 rounded-lg transition hover:bg-gray-50 md:justify-start"
        >
          <img :src="getTeamLogo(awayAbbr)" class="h-10 w-10" alt="" />
          <div class="min-w-0">
            <span class="block text-xs font-black" :style="{ color: awayColor }">{{ awayAbbr }}</span>
            <strong class="block truncate text-base font-black text-gray-950">{{ awayName }}</strong>
          </div>
        </router-link>

        <div class="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
          <strong class="text-3xl font-black leading-none" :style="{ color: awayColor }">
            {{ teamStats.away.points }}
          </strong>
          <span class="text-xs font-black uppercase text-gray-500">vs</span>
          <strong class="text-3xl font-black leading-none" :style="{ color: homeColor }">
            {{ teamStats.home.points }}
          </strong>
        </div>

        <router-link
            :to="{ name: 'TeamDetail', params: { abbr: homeAbbr } }"
            class="flex min-w-0 items-center justify-center gap-3 rounded-lg text-center transition hover:bg-gray-50 md:justify-end md:text-right"
        >
          <div class="min-w-0">
            <span class="block text-xs font-black" :style="{ color: homeColor }">{{ homeAbbr }}</span>
            <strong class="block truncate text-base font-black text-gray-950">{{ homeName }}</strong>
          </div>
          <img :src="getTeamLogo(homeAbbr)" class="h-10 w-10" alt="" />
        </router-link>
      </div>

      <div class="grid gap-2">
        <div
            v-for="row in comparisonRows"
            :key="row.key"
            class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
        >
          <div class="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-3">
            <strong class="text-xl font-black leading-none" :style="{ color: awayColor }">
              {{ formatNumber(row.away) }}
            </strong>
            <span class="text-center text-sm font-black text-gray-600">{{ row.label }}</span>
            <strong class="text-right text-xl font-black leading-none" :style="{ color: homeColor }">
              {{ formatNumber(row.home) }}
            </strong>
          </div>

          <div class="mt-2 flex h-2.5 overflow-hidden rounded-full bg-gray-200">
            <span :style="{ width: `${row.awayShare}%`, backgroundColor: awayColor }"></span>
            <span :style="{ width: `${row.homeShare}%`, backgroundColor: homeColor }"></span>
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <article
            v-for="row in specialRows"
            :key="row.key"
            class="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm"
        >
          <div class="text-sm font-black uppercase text-gray-950">{{ row.label }}</div>

          <div class="mt-3 grid grid-cols-2 gap-3">
            <div>
              <router-link
                  :to="{ name: 'TeamDetail', params: { abbr: awayAbbr } }"
                  class="block text-[11px] font-black hover:underline"
                  :style="{ color: awayColor }"
              >
                {{ awayAbbr }}
              </router-link>
              <strong class="block text-3xl font-black leading-none text-gray-950">{{ formatNumber(row.away) }}</strong>
            </div>
            <div class="text-right">
              <router-link
                  :to="{ name: 'TeamDetail', params: { abbr: homeAbbr } }"
                  class="block text-[11px] font-black hover:underline"
                  :style="{ color: homeColor }"
              >
                {{ homeAbbr }}
              </router-link>
              <strong class="block text-3xl font-black leading-none text-gray-950">{{ formatNumber(row.home) }}</strong>
            </div>
          </div>

          <div class="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-200">
            <span :style="{ width: `${row.awayShare}%`, backgroundColor: awayColor }"></span>
            <span :style="{ width: `${row.homeShare}%`, backgroundColor: homeColor }"></span>
          </div>
        </article>
      </div>

      <div class="mt-4 border-t border-gray-200 pt-4">
        <button
            type="button"
            data-collapse-toggle="team-detailed-stats"
            :aria-expanded="isDetailedStatsOpen"
            aria-controls="team-detailed-stats"
            @click="isDetailedStatsOpen = !isDetailedStatsOpen"
            class="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-black uppercase text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 sm:w-auto"
        >
          <span>Детальная статистика</span>
          <svg
              class="h-4 w-4 shrink-0 transition-transform"
              :class="isDetailedStatsOpen ? 'rotate-180' : ''"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 10 6"
          >
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
          </svg>
        </button>

        <div
            id="team-detailed-stats"
            v-show="isDetailedStatsOpen"
            class="mt-4 grid gap-2"
        >
          <div
              v-for="row in detailStatRows"
              :key="row.key"
              class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
          >
            <div class="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-3">
              <strong class="text-xl font-black leading-none" :style="{ color: awayColor }">
                {{ formatNumber(row.away) }}
              </strong>
              <span class="text-center text-sm font-black text-gray-600">{{ row.label }}</span>
              <strong class="text-right text-xl font-black leading-none" :style="{ color: homeColor }">
                {{ formatNumber(row.home) }}
              </strong>
            </div>

            <div class="mt-2 flex h-2.5 overflow-hidden rounded-full bg-gray-200">
              <span :style="{ width: `${row.awayShare}%`, backgroundColor: awayColor }"></span>
              <span :style="{ width: `${row.homeShare}%`, backgroundColor: homeColor }"></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="mb-4 border-b border-gray-200 pb-3">
        <h2 class="text-2xl font-black uppercase leading-none tracking-normal text-gray-950 sm:text-3xl">
          Динамика игры
        </h2>
      </div>

      <div v-if="leadPoints.length" class="overflow-x-auto">
        <svg
            class="block min-w-[780px] w-full"
            :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
            role="img"
            aria-label="Lead tracker"
        >
          <g>
            <line
                v-for="tick in yTicks"
                :key="`y-${tick}`"
                :x1="chartPad.left"
                :x2="chartWidth - chartPad.right"
                :y1="yScale(tick)"
                :y2="yScale(tick)"
                stroke="#777"
                stroke-width="1.5"
                stroke-dasharray="4 4"
            />
            <text
                v-for="tick in yTicks"
                :key="`label-y-${tick}`"
                :x="chartPad.left - 10"
                :y="yScale(tick) + 5"
                text-anchor="end"
                class="fill-gray-700 text-xs font-bold"
            >
              {{ Math.abs(tick) }}
            </text>
            <line
                v-for="period in periodMarkers"
                :key="`p-${period.label}`"
                :x1="period.x"
                :x2="period.x"
                :y1="chartPad.top"
                :y2="chartHeight - chartPad.bottom"
                stroke="#777"
                stroke-width="1.5"
                stroke-dasharray="4 4"
            />
          </g>

          <line
              :x1="chartPad.left"
              :x2="chartWidth - chartPad.right"
              :y1="yScale(0)"
              :y2="yScale(0)"
              stroke="#555"
              stroke-width="2"
          />

          <rect
              v-for="bar in leadBars"
              :key="bar.key"
              :x="bar.x"
              :y="bar.y"
              :width="bar.width"
              :height="bar.height"
              :fill="bar.color"
          />

          <text :x="chartPad.left + 18" :y="chartPad.top + 28" class="fill-gray-950 text-xl font-medium">
            {{ awayAbbr }}
          </text>
          <text :x="chartPad.left + 18" :y="chartHeight - chartPad.bottom - 14" class="fill-gray-950 text-xl font-medium">
            {{ homeAbbr }}
          </text>
          <text
              v-for="period in periodMarkers"
              :key="`label-${period.label}`"
              :x="period.x"
              :y="chartHeight - 12"
              class="fill-gray-950 text-sm font-bold"
          >
            {{ period.label }}
          </text>
        </svg>

        <div class="mx-auto mt-4 max-w-md">
          <div class="grid grid-cols-[24px_48px_minmax(0,1fr)_48px_24px] items-center justify-items-center gap-3 border-b border-gray-200 pb-2">
            <router-link :to="{ name: 'TeamDetail', params: { abbr: awayAbbr } }" class="transition hover:scale-110">
              <img :src="getTeamLogo(awayAbbr)" class="h-6 w-6" alt="" />
            </router-link>
            <strong class="text-4xl font-black leading-none text-gray-950">{{ leadSummary.awayLead }}</strong>
            <span class="text-center text-2xl font-black leading-none text-gray-950">Biggest Lead</span>
            <strong class="text-4xl font-black leading-none text-gray-950">{{ leadSummary.homeLead }}</strong>
            <router-link :to="{ name: 'TeamDetail', params: { abbr: homeAbbr } }" class="transition hover:scale-110">
              <img :src="getTeamLogo(homeAbbr)" class="h-6 w-6" alt="" />
            </router-link>
          </div>

          <div class="grid gap-3 pt-3 text-center sm:grid-cols-3">
            <div class="flex items-center justify-center gap-2">
              <span class="text-xs font-extrabold uppercase leading-tight text-gray-950">Times tied</span>
              <strong class="text-3xl font-black leading-none text-gray-950">{{ leadSummary.timesTied }}</strong>
            </div>
            <div class="flex items-center justify-center gap-2">
              <span class="text-xs font-extrabold uppercase leading-tight text-gray-950">Longest run</span>
              <strong class="text-3xl font-black leading-none text-gray-950">{{ leadSummary.longestRun }}</strong>
            </div>
            <div class="flex items-center justify-center gap-2">
              <span class="text-xs font-extrabold uppercase leading-tight text-gray-950">Lead changes</span>
              <strong class="text-3xl font-black leading-none text-gray-950">{{ leadSummary.leadChanges }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center text-sm text-gray-500">
        Play-by-play для графика преимущества пока недоступен.
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { getTeamLogo } from '../../../../utils/getTeamLogo'
import { getPlayerImage, handleImageError } from '../../../../utils/playerImage'
import { useTeamStats } from '../../../../composables/NBA/GameFinal/TeamStats/useTeamStats'

const props = defineProps<{
  recap: any
}>()

const isDetailedStatsOpen = ref(false)

const {
  awayAbbr,
  homeAbbr,
  awayName,
  homeName,
  awayColor,
  homeColor,
  leaderRows,
  teamStats,
  comparisonRows,
  specialRows,
  detailStatRows,
  leadPoints,
  leadSummary,
  chartWidth,
  chartHeight,
  chartPad,
  yTicks,
  yScale,
  leadBars,
  periodMarkers,
  formatNumber
} = useTeamStats(toRef(props, 'recap'))
</script>
