<template>
  <main>
    <div v-if="loading" class="min-h-screen text-center text-gray-500">
      Загружаем профиль...
    </div>

    <div v-else-if="error" class="min-h-screen text-center text-red-500">
      {{ error }}
    </div>

    <div v-else-if="profile" class="mx-auto max-w-6xl space-y-5 sm:space-y-8 md:space-y-10">
      <section class="flex flex-col gap-4 rounded-2xl bg-white p-4 text-center shadow-md sm:p-6 md:flex-row md:items-center md:justify-between md:text-left">
        <div class="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-5">
          <img
              v-if="profile.avatar_img"
              :src="profile.avatar_img"
              alt="User avatar"
              class="h-24 w-24 rounded-full object-cover ring-4 ring-gray-100 sm:h-28 sm:w-28"
          >

          <div
              v-else
              class="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 ring-4 ring-gray-100 sm:h-28 sm:w-28"
          >
            <span class="text-2xl font-bold text-gray-600 sm:text-3xl">{{ initials }}</span>
          </div>

          <div class="min-w-0">
            <h1 class="m-0 break-words text-2xl font-black leading-tight text-gray-900 sm:text-3xl">
              {{ fullName }}
            </h1>
            <p class="mt-1 text-sm font-medium text-gray-500">
              {{ registeredSince }}
            </p>
          </div>
        </div>

        <button
            v-if="canFollow"
            type="button"
            class="inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 sm:w-auto"
            :class="isFollowing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'"
            @click="toggleFollow"
        >
          {{ isFollowing ? 'Вы подписаны' : 'Подписаться' }}
        </button>
      </section>

      <PublicProfileProgressSummary
          :watched-count="watchedGames.length"
          :top-team-count="topWatchedTeam?.count ?? 0"
          :top-team-abbr="topWatchedTeam?.abbr"
          :rules="progressRules"
      />

      <PublicProfileWatchedStats
          :games="watchedGames"
          :rules="progressRules"
          :saving-progress-rule="savingProgressRule"
          :progress-rule-error="progressRuleError"
          :save-progress-rule="saveProgressRule"
          :delete-progress-rule="deleteProgressRule"
      />

      <FavoriteTeam :teams="profile.favorites_teams" @select="goToTeam" />

      <FavoritePlayers :players="profile.favorites_players" @select="goToPlayer" />

      <ProfileLikedArticles :user-id="profile.id" title="Избранные статьи" />

      <section class="grid gap-5 lg:grid-cols-2 lg:gap-8">
        <PublicProfileGameList title="Просмотренные матчи" :games="watchedGames" />
        <PublicProfileGameList title="Избранные матчи" :games="favoriteGames" />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import FavoriteTeam from './FavoriteTeam.vue'
import FavoritePlayers from './FavoritePlayers.vue'
import PublicProfileGameList from './PublicProfileGameList.vue'
import PublicProfileProgressSummary from './PublicProfileProgressSummary.vue'
import PublicProfileWatchedStats from './PublicProfileWatchedStats.vue'
import ProfileLikedArticles from '../../Profile/ProfileLikedArticles.vue'
import { usePublicProfile } from '../../../composables/NBA/PublicProfile/usePublicProfile'
import { useProfileProgressRules } from '../../../composables/NBA/PublicProfile/useProfileProgressRules'
import { computed, onMounted } from 'vue'

const {
  profile,
  loading,
  error,
  fullName,
  initials,
  registeredSince,
  favoriteGames,
  watchedGames,
  canFollow,
  isFollowing,
  goToTeam,
  goToPlayer,
  toggleFollow
} = usePublicProfile()

const {
  rules: progressRules,
  saving: savingProgressRule,
  error: progressRuleError,
  fetchRules: fetchProgressRules,
  saveRule: saveProgressRule,
  deleteRule: deleteProgressRule
} = useProfileProgressRules()

const topWatchedTeam = computed(() => {
  const teams = new Map<string, { abbr: string, count: number }>()

  watchedGames.value.forEach((game) => {
    ;[game.awayAbbr, game.homeAbbr].forEach((abbr) => {
      if (!abbr) return
      teams.set(abbr, {
        abbr,
        count: (teams.get(abbr)?.count ?? 0) + 1
      })
    })
  })

  return [...teams.values()].sort((a, b) => b.count - a.count)[0] ?? null
})

onMounted(() => {
  void fetchProgressRules()
})
</script>
