<template>
  <div class="mx-auto w-full max-w-5xl space-y-5 px-0 pb-6 text-left sm:space-y-6 sm:p-4">

    <div v-if="player" class="min-w-0 space-y-4">

      <div
          class="p-4 sm:p-6 rounded-2xl flex items-center gap-4 sm:gap-6 text-white shadow-md relative overflow-hidden"
          :style="cardStyle"
      >
        <img
            :src="getPlayerImage(player)"
            :alt="player.PLAYER_NAME"
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-gray-800 border border-gray-700 z-10 relative shrink-0"
            @error="handleImageError"
        />

        <div class="flex min-w-0 flex-1 flex-col gap-2 z-10 relative">
          <div class="group/player flex min-w-0 items-center gap-2">
            <h1 class="player-name m-0 min-w-0 break-words font-bold leading-tight drop-shadow-md" style="color: white">
              {{ player.PLAYER_NAME }}
            </h1>
            <FavoritePlayerButton
                :player="player"
                size="md"
                class="shrink-0 md:opacity-0 md:group-hover/player:opacity-100"
            />
          </div>

          <div v-if="bio" class="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-white/90">
            <span v-if="age !== null">{{ age }} лет</span>
            <span v-if="bio.position">{{ positionNames[bio.position] || bio.position }}</span>
            <span v-if="birthDate">Родился {{ birthDate }}</span>
            <span v-if="country.name"><span v-if="country.flag" aria-hidden="true" class="mr-1">{{ country.flag }}</span>{{ country.name }}</span>
          </div>

          <div
              v-if="hasTeam"
              @click="goToTeam"
              class="flex max-w-full items-center gap-2 px-3 py-1 rounded-full font-semibold text-white
         cursor-pointer select-none
         transition-all duration-200
         hover:scale-105 hover:shadow-md active:scale-95"
              :style="{ backgroundColor: teamStyle?.bgColorHex }"
          >
            <img
                :src="getTeamLogo(player.TEAM_ABBREVIATION)"
                alt="Logo"
                class="w-6 h-6 rounded-full object-cover bg-white/20"
            />

            <span class="truncate">{{ teamFullName }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">

        <button
            type="button"
          @click="goBack"
            class="group inline-flex items-center gap-2 px-4 py-2 rounded-xl
           bg-white/10 text-black text-sm font-medium
           border border-white/20 shadow-sm
           hover:bg-white/20 hover:shadow-md hover:-translate-y-0.5
           active:scale-95 transition-all duration-200"
        >
          <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>

          Назад
        </button>

        <div class="w-px h-6 bg-white/20"></div>

        <div class="relative group">

          <select
              v-model="season" aria-label="Сезон статистики"
              class="appearance-none px-4 py-2 pr-8 rounded-xl
             bg-white/10 text-black text-sm font-medium
             border border-white/20 shadow-sm
             hover:bg-white/20 cursor-pointer
             transition-all duration-200"
          >
            <option
                v-for="s in seasons"
                :key="s"
                :value="s"
            >
              {{ s }}
            </option>
          </select>

          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
                class="w-4 h-4 text-black/60 group-hover:rotate-180 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <div class="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
                transition duration-300 pointer-events-none
                bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl"></div>

        </div>

      </div>

      <FantasyPlayerTabs v-model="activeTab" :tabs="tabs" :id="tabId" label="Разделы страницы игрока" />
      <section v-if="activeTab==='season'" :id="`${tabId}-panel-season`" role="tabpanel" :aria-labelledby="`${tabId}-tab-season`" class="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <div>
          <h2 class="text-xl font-black text-slate-900">Сезон {{ season }}</h2>
          <p v-if="seasonSummary" class="text-sm text-slate-500">Регулярный сезон · {{ seasonSummary.stats.gamesPlayed }} матчей</p>
        </div>
        <p v-if="seasonLoading" role="status" class="text-sm text-blue-700">Загружаем статистику и места в лиге…</p>
        <p v-else-if="seasonError" role="status" class="text-sm text-amber-800">Места в лиге временно недоступны. <button type="button" class="font-bold underline" @click="reloadSeason++">Повторить</button></p>
        <PlayerStatSummary v-if="seasonSummary" :data="seasonSummary" />
        <p v-else-if="!seasonLoading" class="text-sm text-slate-500">Статистика этого сезона недоступна.</p>
      </section>

      <section v-else-if="activeTab==='career'" :id="`${tabId}-panel-career`" role="tabpanel" :aria-labelledby="`${tabId}-tab-career`" class="space-y-4">
        <div class="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <h2 class="text-xl font-black text-slate-900">Статистика за карьеру</h2>
          <template v-if="careerSummary">
            <p class="text-sm text-slate-500">Регулярные сезоны НБА · {{ careerSummary.stats.gamesPlayed }} матчей</p>
            <PlayerStatSummary :data="careerSummary" radar-label="Показатели игрока за карьеру" />
          </template>
          <p v-else class="text-sm text-slate-500">Карьерные итоги недоступны.</p>
        </div>
        <PlayerCareerAwards :player-name="player.PLAYER_NAME" />
        <div v-if="highs.length" class="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <h2 class="text-xl font-black text-slate-900">Личные рекорды</h2>
          <p class="mt-1 text-sm text-slate-500">Карьерные максимумы по данным NBA.</p>
          <ul class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <li v-for="record in highs" :key="String(record.STAT)" class="rounded-xl border border-slate-200 p-3">
              <button type="button" :disabled="Boolean(openingRecord)" class="block w-full text-left hover:text-blue-700 disabled:opacity-60" @click="openRecord(String(record.GAME_ID))">
                <strong class="text-xl text-blue-700">{{ record.STAT_VALUE }}</strong>
                <p class="text-sm font-semibold">{{ recordLabels[String(record.STAT)] }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ record.GAME_DATE }} · {{ record.VS_TEAM_ABBREVIATION }} {{ openingRecord===String(record.GAME_ID) ? '…' : '↗' }}</p>
              </button>
            </li>
          </ul>
          <p v-if="recordError" role="alert" class="mt-2 text-sm text-rose-700">{{ recordError }}</p>
        </div>
        <div
          v-if="careerTeams.length"
          class="bg-white p-4 rounded-2xl shadow space-y-3"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="font-semibold">Команды в карьере</h2>

          <button
              v-if="careerTeams.length > visibleCareerLimit"
              @click="careerExpanded = !careerExpanded"
              class="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 transition"
          >
            {{ careerExpanded ? 'Свернуть' : 'Показать все' }}
          </button>
        </div>

        <div class="grid gap-2">
          <div
              v-for="item in visibleCareerTeams"
              :key="`${item.startSeason}-${item.endSeason}-${item.team}`"
              class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2"
          >
            <div class="flex items-center gap-2 min-w-0">
              <img
                  :src="getCareerTeamLogo(item.team)"
                  alt="Logo"
                  class="w-7 h-7 rounded-full object-contain bg-gray-50 shrink-0"
              />

              <span class="font-medium truncate">{{ item.team }}</span>
            </div>

            <span class="text-sm text-gray-500 shrink-0">
              {{ formatCareerYears(item) }}
            </span>
          </div>
        </div>
      </div>
      </section>

      <section v-else-if="activeTab==='games'" :id="`${tabId}-panel-games`" role="tabpanel" :aria-labelledby="`${tabId}-tab-games`" class="space-y-4">
        <div class="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <p v-if="sectionLoading" role="status" class="text-sm text-slate-500">Собираем протоколы матчей карьеры…</p>
          <p v-else-if="sectionError" role="alert" class="text-sm text-rose-700">{{ sectionError }} <button type="button" class="font-bold underline" @click="reloadSection++">Повторить</button></p>
          <PlayerCareerGames v-else-if="careerGames" :data="careerGames" />
        </div>
      </section>

      <section v-else :id="`${tabId}-panel-${activeTab}`" role="tabpanel" :aria-labelledby="`${tabId}-tab-${activeTab}`" class="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <p v-if="sectionLoading" role="status" class="text-sm text-slate-500">Загружаем данные…</p>
        <p v-else-if="sectionError" role="alert" class="text-sm text-rose-700">{{ sectionError }} <button type="button" class="font-bold underline" @click="reloadSection++">Повторить</button></p>
        <PlayerComparison v-else-if="activeTab==='compare' && current" :data="current" />
        <template v-else-if="activeTab==='fantasy'">
          <h2 class="text-xl font-black text-slate-900">Карточка фентези</h2>
          <div v-if="current?.fantasy" class="max-w-sm">
            <FantasyPlayerCard :player="current.fantasy" :position="current.fantasy.slot" mode="unlimited" />
          </div>
          <p v-else class="text-sm text-slate-500">Карточка текущего сезона недоступна.</p>
          <RouterLink to="/fantasy" class="inline-block rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">Открыть фентези</RouterLink>
        </template>
        <template v-else-if="activeTab==='contract'">
          <h2 class="text-xl font-black text-slate-900">Контракт · {{ teamFullName }}</h2>
          <template v-if="contract">
            <ul class="divide-y divide-slate-100 rounded-xl border border-slate-200">
              <li v-for="([year,salary]) in salaries" :key="year" class="flex justify-between gap-3 p-3 text-sm">
                <span>{{ year }}<span v-if="contract.options[year]" class="ml-2 text-xs text-slate-500">{{ contract.options[year]==='player' ? 'Опция игрока' : 'Опция команды' }}</span></span>
                <strong>{{ salary === null ? '—' : usd.format(salary) }}</strong>
              </li>
            </ul>
            <p v-if="contract.guaranteed != null" class="text-sm text-slate-600">Гарантировано · {{ usd.format(contract.guaranteed) }}</p>
          </template>
          <p v-else class="text-sm text-slate-500">В загруженных данных команды нет контракта этого игрока.</p>
        </template>
        <PlayerFantasyUsage v-if="activeTab==='fantasy'" :player-id="current?.fantasy?.id" :player-name="player.PLAYER_NAME" />
      </section>

      <PlayerUpcomingMatches v-if="teamId" :team-id="teamId" :team="teamFullName" class="rounded-2xl bg-white p-4 shadow-sm sm:p-6" />
      <div class="bg-white p-4 rounded-2xl shadow">
        <h2 class="font-semibold mb-2">Динамика по матчам</h2>
        <PlayerChart
            :player-id="player.PLAYER_ID"
            :season="season"
            :team="team"
            :season-type="seasonTypeFilter"
        />
      </div>

      <div class="mt-2 text-center sm:text-left">
        <button
            @click="showTeams = !showTeams"
            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          Выбрать команду
        </button>

        <transition name="slide-fade">
          <div
              v-if="showTeams"
              class="flex flex-wrap items-center gap-3 mt-3 p-2 rounded-md"
          >

            <img
                :src="getTeamLogo('ALL_TEAMS')"
                class="cursor-pointer w-16 h-16"
                :class="team !== '' ? 'opacity-50' : 'opacity-100'"
                @click="team = ''"
            />

            <img
                v-for="t in teams"
                :key="t"
                :src="getTeamLogo(t)"
                class="w-8 h-8 cursor-pointer rounded"
                :class="team === '' ? 'opacity-100' : (team === t ? 'opacity-100' : 'opacity-40')"
                @click="team = t"
            />
          </div>
        </transition>
      </div>

      <div v-if="filteredGames.length" class="bg-white p-3 rounded-2xl shadow sm:p-4">
        <PlayerRecentGames :games="filteredGames" :team="team" v-model:seasonTypeFilter="seasonTypeFilter" />
      </div>

    </div>

    <div v-else class="text-center text-slate-600">{{ loadingCareer || loadingPlayers ? 'Загружаем профиль игрока…' : 'Данные игрока недоступны.' }}</div>

  </div>
</template>

<script setup lang="ts">
import { useBackNavigation } from '../../../../composables/useBackNavigation'

import { ref, computed, onMounted, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'

import { usePlayerStats } from '../../../../composables/NBA/player_stats/usePlayerStats'
import { usePlayerPage } from '../../../../composables/NBA/player_stats/usePlayerPage'
import { usePlayerGames } from '../../../../composables/NBA/player_stats/usePlayerGames'
import { useCurrentSeason } from '../../../../composables/NBA/useCurrentSeason'
import { usePlayerCareer, type CareerTeam } from '../../../../composables/NBA/player_stats/usePlayerCareer'

import PlayerRecentGames from './PlayerRecentGames.vue'
import PlayerChart from './PlayerChart.vue'
import FavoritePlayerButton from '../../Favorites/FavoritePlayerButton.vue'

import { getPlayerImage, handleImageError } from '../../../../utils/playerImage'
import { getTeamLogo } from '../../../../utils/getTeamLogo'

import FantasyPlayerTabs from '../../../Fantasy/FantasyPlayerTabs.vue'
import FantasyPlayerCard from '../../../Fantasy/FantasyPlayerCard.vue'
import PlayerStatSummary from '../../../Fantasy/PlayerStatSummary.vue'
import PlayerUpcomingMatches from './PlayerUpcomingMatches.vue'
import PlayerFantasyUsage from './PlayerFantasyUsage.vue'
import { playerCountry } from './playerCountry'
import PlayerComparison from './PlayerComparison.vue'
import PlayerCareerGames from './PlayerCareerGames.vue'
import PlayerCareerAwards from './PlayerCareerAwards.vue'
import { positionNames, resultRows, summaryFromTotals, type ProfileSeason, type ProfileCurrent, type ProfileGames } from './playerProfileData'
import { TEAM_ID_MAP } from '../../../../constants/nbaTeams'
import { gameLocation } from '../../../../api/gameNavigation'
import axios from 'axios'
import type { ContractPlayer, TeamContracts } from '../../../../composables/NBA/Contracts/useTeamContracts'

const { goBack } = useBackNavigation('/player-stats')

const route = useRoute()
const router = useRouter()
const showTeams = ref(false)
const careerExpanded = ref(false)
const visibleCareerLimit = 4

function goToTeam() {
  if (!player.value?.TEAM_ABBREVIATION) return
  router.push(`/team/${player.value.TEAM_ABBREVIATION}`)
}

const { season, seasons: currentSeasons, fetchCurrentSeason } = useCurrentSeason()
const {
  careerPlayer,
  careerSeasons,
  careerTeams,
  latestSeason,
  loadingCareer,
  resultSets,
  fetchPlayerCareer,
} = usePlayerCareer()

const playerName = computed(() => String(route.params.name || ''))
const seasons = computed(() => careerSeasons.value.length ? careerSeasons.value : currentSeasons.value)


const { players, loading:loadingPlayers, team, teams } = usePlayerStats(season)

const player = computed(() => {
  return careerPlayer.value ?? players.value.find(p => p.PLAYER_NAME === playerName.value) ?? undefined
})

const visibleCareerTeams = computed(() => {
  if (careerExpanded.value) return careerTeams.value
  return careerTeams.value.slice(0, visibleCareerLimit)
})

function formatCareerYears(item: CareerTeam) {
  return `${item.startYear}-${item.endYear}`
}

function getCareerTeamLogo(team: string) {
  const firstTeam = team.split(' / ')[0]
  return getTeamLogo(firstTeam)
}


const { teamFullName, teamStyle, cardStyle, hasTeam } =
    usePlayerPage(player)

const tabs = [
  {id:'season',label:'Сезон'}, {id:'career',label:'Карьера'}, {id:'games',label:'Матчи'},
  {id:'compare',label:'Сравнение'}, {id:'fantasy',label:'Фентези'}, {id:'contract',label:'Контракт'}
]
const tabId = useId()
const activeTab = ref('season')
const { filteredGames, seasonTypeFilter } = usePlayerGames(player,team,season)
const teamId = computed(() => TEAM_ID_MAP[player.value?.TEAM_ABBREVIATION || ''])
const seasonData = ref<ProfileSeason | null>(null)
const bio = ref<ProfileSeason['bio']>(null)
const seasonLoading = ref(false)
const seasonError = ref(false)
const reloadSeason = ref(0)
const age = computed(() => {
  const birth = new Date(bio.value?.birthDate || '')
  if (!Number.isFinite(+birth)) return null
  const now = new Date()
  const beforeBirthday = now.getUTCMonth()<birth.getUTCMonth() ||
    (now.getUTCMonth()===birth.getUTCMonth() && now.getUTCDate()<birth.getUTCDate())
  return now.getUTCFullYear()-birth.getUTCFullYear()-Number(beforeBirthday)
})
const country = computed(() => playerCountry(bio.value?.country || ''))
const birthDate = computed(() => {
  const date = new Date((bio.value?.birthDate || '').slice(0,10))
  return Number.isFinite(+date) ? new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'UTC'}).format(date) : ''
})
const seasonSummary = computed(() => {
  if (seasonData.value?.season?.stats.gamesPlayed) return seasonData.value.season
  const rows = resultRows(resultSets.value,'SeasonTotalsRegularSeason').filter(row => row.SEASON_ID===season.value)
  const total = rows.find(row => Number(row.TEAM_ID)===0 || row.TEAM_ABBREVIATION==='TOT')
  return summaryFromTotals(total ? [total] : rows)
})
const careerSummary = computed(() => summaryFromTotals(resultRows(resultSets.value,'CareerTotalsRegularSeason').filter(row => row.LEAGUE_ID==='00').slice(0,1)))
const recordLabels: Record<string,string> = {PTS:'Очки',REB:'Подборы',OREB:'Подборы в нападении',DREB:'Подборы в защите',AST:'Передачи',STL:'Перехваты',BLK:'Блоки',TOV:'Потери',FGM:'Попадания с игры',FG3M:'Трёхочковые',FTM:'Штрафные',MIN:'Минуты',FGA:'Броски с игры',FG3A:'Трёхочковые попытки',FTA:'Попытки штрафных'}
const highs = computed(() => {
  const records = resultRows(resultSets.value,'CareerHighs').filter(row => row.GAME_ID && recordLabels[String(row.STAT)])
  return [...new Map(records.map(row => [row.STAT,row])).values()]
})
const current = ref<ProfileCurrent | null>(null)
const careerGames = ref<ProfileGames | null>(null)
const contract = ref<ContractPlayer | null>(null)
const contractLoaded = ref(false)
const sectionLoading = ref(false)
const sectionError = ref('')
const reloadSection = ref(0)
const usd = new Intl.NumberFormat('ru-RU',{style:'currency',currency:'USD',maximumFractionDigits:0})
const salaries = computed(() => Object.entries(contract.value?.salaries || {}).filter(([year,value])=>value!==null || contract.value?.options[year]).sort(([a],[b])=>a.localeCompare(b)))
const normalizeName = (value: string) => value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'')
const profileUrl = (section: string) => `/api/player-profile/${encodeURIComponent(playerName.value)}/${section}`

const openingRecord = ref('')
const recordError = ref('')
async function openRecord(id: string) {
  const name = playerName.value
  openingRecord.value = id
  recordError.value = ''
  try {
    const {data} = await axios.get(profileUrl('record'),{params:{id},timeout:35000})
    if (name===playerName.value) await router.push(gameLocation(data))
  } catch {
    if (name===playerName.value) recordError.value = 'Не удалось открыть протокол матча рекорда.'
  } finally {
    if (name===playerName.value) openingRecord.value = ''
  }
}

watch(playerName, () => {
  bio.value = null
  openingRecord.value = ''
  recordError.value = ''
  current.value = null
  careerGames.value = null
  contract.value = null
  contractLoaded.value = false
}, {flush:'sync'})

watch([playerName,season,()=>player.value?.PLAYER_ID,reloadSeason], async ([,selected,id], _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  seasonData.value = null
  seasonError.value = false
  seasonLoading.value = Boolean(selected && id)
  if (!selected || !id) return
  try {
    const {data} = await axios.get<ProfileSeason>(profileUrl('season'), {params:{season:selected},signal:controller.signal,timeout:40000})
    if (controller.signal.aborted) return
    seasonData.value = data
    if (data.bio) bio.value = data.bio
  } catch {
    if (!controller.signal.aborted) seasonError.value = true
  } finally {
    if (!controller.signal.aborted) seasonLoading.value = false
  }
}, {immediate:true})

watch([activeTab,player,reloadSection], async ([tab,selected], _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  sectionLoading.value = false
  sectionError.value = ''
  if (!selected || !['games','compare','fantasy','contract'].includes(tab)) return
  if (tab==='games' ? careerGames.value : tab==='contract' ? contractLoaded.value : current.value) return
  sectionLoading.value = true
  try {
    if (tab==='contract') {
      if (selected.TEAM_ABBREVIATION) {
        const {data} = await axios.get<TeamContracts>(`/api/team-contracts/${encodeURIComponent(selected.TEAM_ABBREVIATION)}`,{signal:controller.signal,timeout:25000})
        if (controller.signal.aborted) return
        contract.value = data.players.find(p=>String(p.nbaPlayerId)===String(selected.PLAYER_ID))
          || data.players.find(p=>normalizeName(p.name)===normalizeName(selected.PLAYER_NAME)) || null
      }
      contractLoaded.value = true
    } else {
      const {data} = await axios.get(profileUrl(tab==='games'?'games':'current'),{signal:controller.signal,timeout:tab==='games'?145000:25000})
      if (controller.signal.aborted) return
      if (tab==='games') careerGames.value = data
      else current.value = data
    }
  } catch {
    if (!controller.signal.aborted) sectionError.value = 'Не удалось загрузить данные этого раздела.'
  } finally {
    if (!controller.signal.aborted) sectionLoading.value = false
  }
}, {immediate:true})

onMounted(() => { void fetchCurrentSeason() })
watch(playerName, async (name, _, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  activeTab.value = 'season'
  careerExpanded.value = false
  team.value = ''
  await fetchPlayerCareer(name)
  if (!cancelled && latestSeason.value) season.value = latestSeason.value
}, { immediate:true, flush:'post' })

</script>

<style scoped>
.player-name {
  font-size: clamp(1.45rem, 8vw, 2rem);
  line-height: 1.05;
  max-width: 100%;
}

@media (min-width: 640px) {
  .player-name {
    font-size: 2.25rem;
  }
}
</style>
