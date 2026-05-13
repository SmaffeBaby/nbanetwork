<template>
  <main>
    <div v-if="loading" class="min-h-screen text-center text-gray-500">
      Загружаем профиль...
    </div>

    <div v-else-if="error" class="min-h-screen text-center text-red-500">
      {{ error }}
    </div>

    <div v-else-if="profile" class="mx-auto max-w-6xl space-y-10">
      <section class="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div class="flex flex-col gap-5 md:flex-row md:items-center">
          <img
              v-if="profile.avatar_img"
              :src="profile.avatar_img"
              alt="User avatar"
              class="h-28 w-28 rounded-full object-cover ring-4 ring-gray-100"
          >

          <div
              v-else
              class="inline-flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 ring-4 ring-gray-100"
          >
            <span class="text-3xl font-bold text-gray-600">{{ initials }}</span>
          </div>

          <div class="min-w-0">
            <h1 class="text-3xl font-black text-gray-900">
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
            class="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95"
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

      <ProfileLikedArticles :user-id="profile.id" title="Понравившиеся статьи" />

      <section class="grid gap-8 lg:grid-cols-2">
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
