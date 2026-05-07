<template>
  <section class="space-y-3">
    <div>
      <h2 class="text-lg font-bold text-gray-900">Любимые команды</h2>
      <p class="text-sm text-gray-500">Выберите команды, которые хотите видеть на главной.</p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <button
          v-for="team in teams"
          :key="team.abbr"
          type="button"
          class="relative rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
          :class="team.isFavorite ? 'border-rose-300 bg-rose-50 shadow-sm' : 'border-gray-200 bg-white'"
          @click="toggle(team.abbr)"
      >
        <HeartSolidIcon
            v-if="team.isFavorite"
            class="absolute right-2 top-2 h-5 w-5 text-rose-500"
        />
        <HeartOutlineIcon
            v-else
            class="absolute right-2 top-2 h-5 w-5 text-gray-300"
        />

        <img :src="team.logo" :alt="team.name" class="h-14 w-14 object-contain" />
        <div class="mt-2 pr-5 text-sm font-semibold text-gray-900">
          {{ team.name }}
        </div>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { HeartIcon as HeartOutlineIcon } from '@heroicons/vue/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/vue/24/solid'
import { useAuthStore } from '../../stores/auth'
import { TEAM_ID_MAP } from '../../constants/nbaTeams'
import { teamsFullNames } from '../../constants/TeamFullName'
import { getTeamLogo } from '../../utils/getTeamLogo'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const teams = computed(() =>
    Object.keys(TEAM_ID_MAP).map(abbr => ({
      abbr,
      name: teamsFullNames[abbr] ?? abbr,
      logo: getTeamLogo(abbr),
      isFavorite: Boolean(user.value?.favoriteTeams.includes(abbr))
    }))
)

const toggle = async (abbr: string) => {
  await auth.toggleFavoriteTeam(abbr)
}
</script>
