<template>
  <main>
    <div v-if="loading" class="min-h-screen text-center text-gray-500">
      Загружаем профиль...
    </div>

    <div v-else-if="error" class="min-h-screen text-center text-red-500">
      {{ error }}
      <button v-if="auth.user" type="button" class="ml-2 font-semibold underline" @click="retryProfile">Повторить</button>
    </div>

    <div v-else-if="profile" class="mx-auto max-w-6xl space-y-5 sm:space-y-8 md:space-y-10">
      <section class="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50 p-5 text-center shadow-sm sm:p-6 md:flex-row md:items-center md:justify-between md:text-left">
        <div class="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-5">
          <img
              v-if="profile.avatar_img"
              :src="profile.avatar_img"
              alt="User avatar"
              class="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-gray-100 sm:h-28 sm:w-28"
          >

          <div
              v-else
              class="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 ring-4 ring-gray-100 sm:h-28 sm:w-28"
          >
            <span class="text-2xl font-bold text-gray-600 sm:text-3xl">{{ initials }}</span>
          </div>

          <div class="min-w-0 w-full">
            <h1 style="margin: 0" class="m-0 break-words text-2xl font-black leading-tight text-gray-900 sm:text-3xl">
              {{ fullName }}
            </h1>
            <PublicProfileConnections :profile-id="profile.id" />
            <PublicProfileExperience ref="experiencePanel" :profile-id="profile.id" :watched-count="watchedGames.length" :top-team-count="topWatchedTeam?.count ?? 0" :rules="progressRules" />
            <div v-if="socialLinks.length" class="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
              <a v-for="link in socialLinks" :key="link.label" :href="link.url" target="_blank" rel="noopener noreferrer nofollow ugc" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-700">{{ link.label }} <span aria-hidden="true">↗</span></a>
            </div>
            <p class="mt-2 text-sm font-medium text-gray-500">
              {{ registeredSince }}
            </p>
          </div>
        </div>

        <button
            v-if="canFollow"
            type="button"
            class="inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 sm:w-auto"
            :class="isFollowing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'"
            :disabled="followPending"
            @click="toggleFollow"
        >
          {{ followPending ? 'Сохраняем...' : isFollowing ? 'Вы подписаны' : 'Подписаться' }}
        </button>
      </section>

      <p v-if="canFollow && followError" role="alert" class="text-sm text-red-600">{{ followError }}</p>
      <div v-if="isOwnProfile" class="flex justify-end">
        <RouterLink to="/profile" class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Настройки профиля</RouterLink>
      </div>
      <nav class="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5" aria-label="Разделы профиля">
        <div class="flex min-w-max gap-1 sm:min-w-0" role="tablist" aria-label="Разделы профиля">
          <button v-for="tab in tabs" :id="`${tabsId}-${tab.key}`" :key="tab.key" type="button" role="tab" :aria-selected="activeTab === tab.key" :aria-controls="panelId" :tabindex="activeTab === tab.key ? 0 : -1" class="flex-1 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :class="activeTab === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'" @click="selectTab(tab.key)" @keydown.right.prevent="moveTab(1)" @keydown.left.prevent="moveTab(-1)" @keydown.home.prevent="selectTab(tabs[0]!.key, true)" @keydown.end.prevent="selectTab(tabs[tabs.length - 1]!.key, true)">{{ tab.label }}</button>
        </div>
      </nav>
      <div :id="panelId" role="tabpanel" :aria-labelledby="`${tabsId}-${activeTab}`" class="space-y-5 focus:outline-none" tabindex="0">
        <template v-if="activeTab === 'overview'">
          <div class="grid grid-cols-3 gap-2 sm:gap-4">
            <button v-for="item in overviewStats" :key="item.label" type="button" class="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 sm:p-5" @click="selectTab(item.tab)"><span class="block text-2xl font-black text-slate-900 sm:text-3xl">{{ item.value }}</span><span class="mt-1 block text-xs text-slate-500 sm:text-sm">{{ item.label }}</span></button>
          </div>
          <PublicProfileProgressSummary @open-achievements="category => experiencePanel?.openCategory(category)" :watched-count="watchedGames.length" :top-team-count="topWatchedTeam?.count ?? 0" :top-team-abbr="topWatchedTeam?.abbr" :rules="progressRules" />
          <PublicProfileGameList title="Последние просмотренные матчи" :games="watchedGames.slice(0, 5)" />
          <button v-if="watchedGames.length > 5" type="button" class="text-sm font-bold text-blue-600" @click="selectTab('games')">Все матчи →</button>
        </template>
        <ProfileFantasy v-else-if="activeTab === 'fantasy'" :profile-id="profile.id" />
        <PublicProfileWatchedStats v-else-if="activeTab === 'stats'" :games="watchedGames" :rules="progressRules" :saving-progress-rule="savingProgressRule" :progress-rule-error="progressRuleError" :save-progress-rule="saveProgressRule" :delete-progress-rule="deleteProgressRule" />
        <section v-else-if="activeTab === 'games'" class="grid gap-5 lg:grid-cols-2 lg:gap-8">
          <PublicProfileGameList title="Просмотренные матчи" :games="watchedGames" />
          <PublicProfileGameList title="Избранные матчи" :games="favoriteGames" />
        </section>
        <template v-else-if="activeTab === 'favorites'">
          <FavoriteTeam :teams="profile.favorites_teams" @select="goToTeam" />
          <FavoritePlayers :players="profile.favorites_players" @select="goToPlayer" />
        </template>
        <ProfileLikedArticles v-else-if="activeTab === 'articles'" :user-id="profile.id" title="Избранные статьи" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import ProfileFantasy from '../../Fantasy/ProfileFantasy.vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../../stores/auth'
import PublicProfileConnections from './PublicProfileConnections.vue'
import FavoriteTeam from './FavoriteTeam.vue'
import FavoritePlayers from './FavoritePlayers.vue'
import PublicProfileGameList from './PublicProfileGameList.vue'
import PublicProfileExperience from './PublicProfileExperience.vue'
import { normalizeSocialLink } from '../../../utils/socialLinks'
import PublicProfileProgressSummary from './PublicProfileProgressSummary.vue'
import PublicProfileWatchedStats from './PublicProfileWatchedStats.vue'
import ProfileLikedArticles from '../../Profile/ProfileLikedArticles.vue'
import { usePublicProfile } from '../../../composables/NBA/PublicProfile/usePublicProfile'
import { useProfileProgressRules } from '../../../composables/NBA/PublicProfile/useProfileProgressRules'
import { computed, nextTick, onMounted, ref, useId } from 'vue'

const {
  profile,
  retryProfile,
  followPending,
  followError,
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

const tabs = [
  { key: 'overview', label: 'Обзор' }, { key: 'fantasy', label: 'Фентези' },
  { key: 'stats', label: 'Статистика' }, { key: 'games', label: 'Матчи' },
  { key: 'favorites', label: 'Избранное' }, { key: 'articles', label: 'Статьи' }
] as const
type ProfileTab = typeof tabs[number]['key']
const route = useRoute(), router = useRouter(), tabsId = useId(), panelId = useId()
const activeTab = computed<ProfileTab>(() => tabs.find(tab => tab.key === route.query.tab)?.key ?? 'overview')
async function selectTab(tab: ProfileTab, focus = false) {
  await router.replace({ query: { ...route.query, tab: tab === 'overview' ? undefined : tab } })
  if (focus) { await nextTick(); document.getElementById(`${tabsId}-${tab}`)?.focus() }
}
function moveTab(direction: number) {
  const index = tabs.findIndex(tab => tab.key === activeTab.value)
  void selectTab(tabs[(index + direction + tabs.length) % tabs.length]!.key, true)
}
const overviewStats = computed(() => [
  { label: 'Матчей просмотрено', value: watchedGames.value.length, tab: 'games' as const },
  { label: 'Любимых команд', value: profile.value?.favorites_teams?.length ?? 0, tab: 'favorites' as const },
  { label: 'Любимых игроков', value: profile.value?.favorites_players?.length ?? 0, tab: 'favorites' as const }
])

const experiencePanel = ref<InstanceType<typeof PublicProfileExperience> | null>(null)
const auth = useAuthStore()
const isOwnProfile = computed(() => Boolean(profile.value && auth.user?.id === profile.value.id))

const socialLinks = computed(() => {
  const links: { label: string; url: string }[] = []
  for (const [network, value] of [['telegram', profile.value?.telegram_url], ['instagram', profile.value?.instagram_url]] as const) {
    try {
      const url = normalizeSocialLink(value, network)
      if (url) links.push({ label: network === 'telegram' ? 'Telegram' : 'Instagram', url })
    } catch { /* Do not render invalid legacy links. */ }
  }
  return links
})

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
