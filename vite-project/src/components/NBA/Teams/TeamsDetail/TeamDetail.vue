<template>
  <div class="mx-auto w-full max-w-6xl space-y-5 pb-6 text-left sm:space-y-6 sm:p-6">

    <div class="flex justify-center">
      <div class="relative flex w-full max-w-sm items-center justify-center rounded-2xl bg-white p-6 shadow sm:max-w-md sm:p-8 md:bg-transparent md:p-0 md:shadow-none">
        <img :src="getTeamLogo(teamAbbr)" class="h-36 w-36 object-contain sm:h-56 sm:w-56 md:h-72 md:w-72" />
        <FavoriteTeamButton
            :teamAbbr="teamAbbr"
            size="lg"
            class="absolute right-3 top-3"
        />
      </div>
    </div>

    <div class="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
      <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-start">
      <button
          @click="$router.back()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl
               bg-white/10 backdrop-blur-md text-black text-sm font-medium
               border border-white/20 shadow-sm
               hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5
               active:scale-95 transition-all duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <Categories
          v-model="activeTab"
          :options="tabOptions"
          placeholder="Раздел команды"
      />
      </div>

      <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
            v-if="showSeasonSelector"
            v-model="season"
            class="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm sm:w-auto"
        >
          <option v-for="s in seasons" :key="s" :value="s">
            {{ s }}
          </option>
        </select>

        <div
            v-if="showSeasonTypeSwitcher"
            class="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 sm:w-fit"
        >
          <button
              @click="seasonType = 'regular'"
              class="rounded-lg px-4 py-2 text-sm font-medium transition"
              :class="seasonType === 'regular' ? 'bg-white shadow text-gray-950' : 'text-gray-500'"
          >
            Regular
          </button>

          <button
              @click="seasonType = 'playoffs'"
              class="rounded-lg px-4 py-2 text-sm font-medium transition"
              :class="seasonType === 'playoffs' ? 'bg-white shadow text-gray-950' : 'text-gray-500'"
          >
            Playoffs
          </button>
        </div>
      </div>
    </div>

    <div class="min-w-0">
      <TeamUpcomingGames
          v-if="activeTab === 'Будущие игры'"
          :teamId="teamId"
      />
      <TeamGamesTable
          v-if="activeTab === 'История игр'"
          :teamId="teamId"
          :season="season"
      />
      <TeamStats
          v-if="activeTab === 'Команда'"
          :teamAbbr="teamAbbr"
          :season="season"
          :seasonType="seasonType"
      />
      <TeamAbout
          v-if="activeTab === 'О команде'"
          :teamAbbr="teamAbbr"
      />
      <TeamStats2
          v-if="activeTab === 'Статистика'"
          :teamId="teamId"
          :season="season"
          :seasonType="seasonType"
      />
      <TeamPointsTrendTable
          v-if="activeTab === 'Форма'"
          :teamId="teamId"
          :season="season"
          :seasonType="seasonType"
      />
      <TeamArticles
          v-if="activeTab === 'Статьи'"
          :teamAbbr="teamAbbr"
      />
      <TeamContractsPayroll
          v-if="activeTab === 'Контракты'"
          :teamAbbr="teamAbbr"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

import TeamStats from './TeamStats.vue'
import TeamGamesTable from './TeamGamesTable.vue'
import TeamUpcomingGames from './TeamUpcomingGames.vue'
import TeamStats2 from './TeamStats2.vue'
import TeamPointsTrendTable from './TeamPointsTrendTable.vue'
import TeamArticles from './TeamArticles.vue'
import TeamContractsPayroll from '../../Contracts/TeamContractsPayroll.vue'
import FavoriteTeamButton from '../../Favorites/FavoriteTeamButton.vue'
import Categories from '../../../Categories/Categories.vue'

import { getTeamLogo } from '../../../../utils/getTeamLogo'
import { generateNbaSeasons } from '../../../../utils/generateNbaSeasons'
import { TEAM_ID_MAP } from '../../../../constants/nbaTeams'
import type { CategoryOption } from '../../../../types/categories'

const TeamAbout = defineAsyncComponent(() => import('./TeamAbout.vue'))

const route = useRoute()
const teamAbbr = computed(() => String(route.params.abbr || '').toUpperCase())

type TeamTab = 'Будущие игры' | 'Команда' | 'О команде' | 'История игр' | 'Статистика' | 'Форма' | 'Статьи' | 'Контракты'

const tabOptions: CategoryOption<TeamTab>[] = [
  { value: 'Будущие игры', label: 'Будущие игры' },
  { value: 'Команда', label: 'Команда' },
  { value: 'О команде', label: 'О команде' },
  { value: 'История игр', label: 'История игр' },
  { value: 'Статистика', label: 'Статистика' },
  { value: 'Форма', label: 'Форма' },
  { value: 'Контракты', label: 'Контракты' },
  { value: 'Статьи', label: 'Статьи', dividerBefore: true }
]
const activeTab = ref<TeamTab>('Команда')
const seasonType = ref<'regular' | 'playoffs'>('regular')

const teamId = computed(() => TEAM_ID_MAP[teamAbbr.value] ?? 0)
const showSeasonSelector = computed(() =>
    ['Команда', 'История игр', 'Статистика', 'Форма'].includes(activeTab.value)
)
const showSeasonTypeSwitcher = computed(() =>
    ['Команда', 'Статистика', 'Форма'].includes(activeTab.value)
)

const seasons = generateNbaSeasons(2000, 2025)

const season = ref(seasons[0])
</script>
