<template>
  <section v-if="user" class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-[10px] leading-15 font-bold break-words text-center pl-0 md:text-left md:pl-10 max-w-md">
        {{ title }}
      </h1>

      <RouterLink
          to="/teams"
          class="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
      >
        Все команды
      </RouterLink>
    </div>

    <div
        v-if="favoriteTeams.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <button
          v-for="team in favoriteTeams"
          :key="team.abbr"
          type="button"
          class="group relative overflow-hidden rounded-2xl p-5 text-left text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
          :style="{ backgroundColor: team.bgColor }"
          @click="goToTeam(team.abbr)"
      >
        <img
            v-if="team.bgSvg"
            :src="team.bgSvg"
            class="absolute inset-0 h-full w-full object-cover opacity-10 transition group-hover:opacity-20"
        />
        <div class="absolute inset-0 bg-gradient-to-br from-black/55 via-black/20 to-black/60"></div>
        <FavoriteTeamButton
            :teamAbbr="team.abbr"
            class="absolute right-3 top-3 z-20"
        />

        <div class="relative z-10 flex items-center gap-4 pr-10">
          <img :src="team.logo" :alt="team.name" class="h-20 w-20 object-contain drop-shadow-2xl transition group-hover:scale-110" />
          <div>
            <div class="text-sm font-semibold text-white/70">{{ team.abbr }}</div>
            <div class="text-xl font-black leading-tight">{{ team.name }}</div>
          </div>
        </div>
      </button>
    </div>

    <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500"
    >
      Любимые команды появятся здесь после выбора на странице команд.
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth'
import { teamsFullNames } from '../../../constants/TeamFullName'
import { teamStyles } from '../../../constants/TeamColorsAndBackground'
import { getTeamLogo } from '../../../utils/getTeamLogo'
import FavoriteTeamButton from './FavoriteTeamButton.vue'

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const router = useRouter()

const favoriteTeams = computed(() =>
    (user.value?.favoriteTeams ?? []).map(abbr => ({
      abbr,
      name: teamsFullNames[abbr] ?? abbr,
      logo: getTeamLogo(abbr),
      bgColor: teamStyles[abbr]?.bgColorHex ?? '#111827',
      bgSvg: teamStyles[abbr]?.bgSvg
    }))
)

const title = computed(() =>
    favoriteTeams.value.length === 1 ? 'Любимая команда' : 'Любимые команды'
)

const goToTeam = (abbr: string) => {
  router.push({ name: 'TeamDetail', params: { abbr } })
}
</script>
