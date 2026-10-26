<template>
  <div class="space-y-5 text-slate-950">
    <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div class="bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-5 sm:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-2">
            <img
                src="/logos/PLAYOFFS_SERIES.svg"
                alt="NBA Playoffs — Playoff series"
                class="h-auto w-full max-w-[320px]"
            />
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <label class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Сезон</span>
              <select
                  v-model="selectedSeason"
                  class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option v-for="s in seasons" :key="s" :value="s">
                  {{ s }}
                </option>
              </select>
            </label>

            <label class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Раунд</span>
              <select
                  v-model="selectedRound"
                  class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="All">Все</option>
                <option v-for="round in roundOptions" :key="round" :value="round">
                  {{ round }}
                </option>
              </select>
            </label>

            <label class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Команда</span>
              <select
                  v-model="selectedTeam"
                  class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="All">Все команды</option>
                <option v-for="team in teamOptions" :key="team" :value="team">
                  {{ team }}
                </option>
              </select>
            </label>

            <label class="space-y-1">
              <span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Статус</span>
              <select
                  v-model="selectedStatus"
                  class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="All">Все серии</option>
                <option value="Finished">Звершенные</option>
                <option value="In progress">Ещё идут</option>
              </select>
            </label>

            <div class="flex items-end">
              <button
                  type="button"
                  class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 lg:w-auto"
                  @click="toggleSpoilers"
              >
                <EyeIcon v-if="hideSpoilers" class="h-5 w-5" />
                <EyeSlashIcon v-else class="h-5 w-5" />
                {{ hideSpoilers ? 'Показать спойлеры' : 'Скрыть спойлеры' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <PlayoffBracket
        v-model:conference="selectedConference"
        :series="bracketSeries"
        :hide-spoilers="hideSpoilers"
        @open-series-modal="openSeriesModal"
        @go-team="goToTeam"
    />

    <div v-if="!filteredSeries.length" class="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div class="mx-auto mb-3 h-3 w-3 rounded-full bg-slate-300"></div>
      <div class="text-sm font-semibold text-slate-500">Нет фильтров</div>
      <button
          type="button"
          class="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600"
          @click="resetFilters"
      >
        Сбросить фильтры
      </button>
    </div>

    <div
        v-if="modalSeries"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        @click.self="closeSeriesModal"
    >
      <section class="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-white to-emerald-50 p-5">
          <div class="min-w-0">
            <div class="mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              {{ modalSeries.round }}
            </div>
            <h3 class="text-2xl font-black text-slate-950">
              {{ formatTeam(modalSeries.series.teamA) }}
              <span class="text-slate-300">vs</span>
              {{ formatTeam(modalSeries.series.teamB) }}
            </h3>
            <p class="mt-1 text-sm font-semibold text-slate-500">
              Дата: {{ modalSeries.startDate }} / {{ modalSeries.series.games.length }} игр
            </p>
          </div>

          <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
              @click="closeSeriesModal"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <div ref="modalScroll" class="max-h-[66vh] space-y-3 overflow-y-auto p-5">
          <div class="grid gap-3 sm:grid-cols-2">
            <div
                v-for="team in [modalSeries.series.teamA, modalSeries.series.teamB]"
                :key="team"
                class="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                :class="!hideSpoilers && modalSeries.winner === team ? 'bg-emerald-50' : ''"
            >
              <button
                  type="button"
                  class="flex min-w-0 items-center gap-3 text-left"
                  @click="goToTeam(getTeamAbbr(team))"
              >
                <img :src="getLogo(team)" :alt="formatTeam(team)" class="h-10 w-10 object-contain" />
                <span class="min-w-0">
                  <span class="block truncate text-base font-black text-slate-950">
                    {{ formatTeam(team) }} <span class="text-slate-400">{{ getSeed(team) }}</span>
                  </span>
                  <span class="block text-xs font-semibold text-slate-400">
                    {{ hideSpoilers ? 'Победы скрыты' : `${getTeamWins(modalSeries.series, team)} побед` }}
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div
              v-for="(g, gameIndex) in modalSeries.series.games"
              :key="g.GAME_ID"
              role="button"
              tabindex="0"
              class="grid cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-md sm:grid-cols-[1fr_auto] sm:items-center"
              @click="goToGame(g)"
              @keydown.enter="goToGame(g)"
          >
            <div class="min-w-0">
              <div class="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Игра {{ gameIndex + 1 }} / {{ g.GAME_DATE }}
              </div>
              <div class="mt-1 truncate text-sm font-semibold text-slate-700">
                {{ formatTeam(g.away.team) }} at {{ formatTeam(g.home.team) }}
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
              <div
                  class="flex min-w-24 items-center gap-2 rounded-xl px-3 py-2"
                  :class="isGameVisible(g.GAME_ID) && g.away.wl === 'W' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'"
              >
                <img :src="getLogo(g.away.team)" :alt="formatTeam(g.away.team)" class="h-7 w-7 object-contain" />
                <div>
                  <div class="text-[11px] font-bold uppercase tracking-[0.14em]">{{ getTeamAbbr(g.away.team) }}</div>
                  <div class="text-lg font-black">{{ displayScore(g.GAME_ID, g.away.pts) }}</div>
                </div>
              </div>

              <div class="text-xs font-black uppercase tracking-[0.2em] text-slate-300">vs</div>

              <div
                  class="flex min-w-24 items-center gap-2 rounded-xl px-3 py-2"
                  :class="isGameVisible(g.GAME_ID) && g.home.wl === 'W' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'"
              >
                <img :src="getLogo(g.home.team)" :alt="formatTeam(g.home.team)" class="h-7 w-7 object-contain" />
                <div>
                  <div class="text-[11px] font-bold uppercase tracking-[0.14em]">{{ getTeamAbbr(g.home.team) }}</div>
                  <div class="text-lg font-black">{{ displayScore(g.GAME_ID, g.home.pts) }}</div>
                </div>
              </div>

              <button
                  v-if="hideSpoilers"
                  type="button"
                  class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                  @click.stop="toggleGameVisibility(g.GAME_ID)"
              >
                {{ isGameVisible(g.GAME_ID) ? 'Скрыть' : 'Показать' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import type { ConferenceFilter } from '../../../composables/NBA/Playoffs/usePlayoffBracket'
import { EyeIcon, EyeSlashIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PlayoffBracket from './PlayoffBracket.vue'
import { usePlayoffGames } from '../../../composables/NBA/Playoffs/usePlayoffGames'
import { usePlayoffNavigation } from '../../../composables/NBA/Playoffs/usePlayoffNavigation'
import { usePlayoffSeriesView } from '../../../composables/NBA/Playoffs/usePlayoffSeriesView'
import { usePlayoffSpoilers } from '../../../composables/NBA/Playoffs/usePlayoffSpoilers'
import { usePlayoffTeams } from '../../../composables/NBA/Playoffs/usePlayoffTeams'

const {
  seasons,
  selectedSeason,
  series,
  formatTeam,
  getSeed,
  loadAll,
  loadSeasons
} = usePlayoffGames()

const seasonsReady = ref(false)

const { getTeamAbbr, getLogo, getTeamConference } = usePlayoffTeams(formatTeam)
const { goToTeam, goToGame } = usePlayoffNavigation()
const {
  hideSpoilers,
  isGameVisible,
  displayScore,
  toggleGameVisibility,
  toggleSpoilers
} = usePlayoffSpoilers()
const {
  selectedModalSeriesKey,
  selectedRound,
  selectedTeam,
  selectedStatus,
  roundOptions,
  teamOptions,
  filteredSeries,
  bracketSeries,
  modalSeries,
  getTeamWins,
  openSeriesModal,
  closeSeriesModal,
  resetFilters
} = usePlayoffSeriesView({
  series,
  formatTeam,
  getSeed,
  getTeamAbbr,
  getLogo,
  getTeamConference
})

// Store view state on this history entry, so each visit restores its own series.
const history = useRouter().options.history
const savedView = history.state.playoffView as {
  season?: string; round?: string; team?: string; status?: string;
  seriesKey?: string | null; conference?: ConferenceFilter; modalScroll?: number
} | undefined
const selectedConference = ref<ConferenceFilter>(savedView?.conference ?? 'All')
const modalScroll = ref<HTMLElement | null>(null)
if (savedView) {
  if (savedView.season && seasons.value.includes(savedView.season)) selectedSeason.value = savedView.season
  selectedRound.value = savedView.round ?? 'All'
  selectedTeam.value = savedView.team ?? 'All'
  selectedStatus.value = savedView.status ?? 'All'
  selectedModalSeriesKey.value = savedView.seriesKey ?? null
}
let restoreModalScroll = savedView?.modalScroll ?? 0
watch(modalSeries, async value => {
  if (!value) return
  await nextTick()
  if (modalScroll.value) modalScroll.value.scrollTop = restoreModalScroll
  restoreModalScroll = 0
})
onBeforeRouteLeave(() => {
  history.replace(history.location, {
    ...history.state,
    playoffView: {
      season: selectedSeason.value,
      round: selectedRound.value,
      team: selectedTeam.value,
      status: selectedStatus.value,
      seriesKey: selectedModalSeriesKey.value,
      conference: selectedConference.value,
      modalScroll: modalScroll.value?.scrollTop ?? 0
    }
  })
})

onMounted(async () => {
  await loadSeasons()
  seasonsReady.value = true

  if (selectedSeason.value) {
    await loadAll(selectedSeason.value)
  }
})

watch(selectedSeason, (season) => {
  if (season && seasonsReady.value) {
    closeSeriesModal()
    loadAll(season)
  }
})
</script>
