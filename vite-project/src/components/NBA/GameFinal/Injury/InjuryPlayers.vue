<template>
  <div class="space-y-4 text-left sm:space-y-6">

    <div
        v-if="!enriched.length"
        class="text-center text-sm text-gray-400 py-10"
    >
      Нет травмированных игроков
    </div>

    <div class="grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2 sm:gap-4 sm:text-gray-400">
      <div class="font-semibold sm:text-left">
        {{ awayAbbr }}
      </div>
      <div class="hidden text-right font-semibold sm:block">
        {{ homeAbbr }}
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

      <div class="space-y-3">

        <div
            v-for="p in awayPlayers"
            :key="p.PLAYER_ID"
            class="flex min-w-0 items-center gap-2 rounded-xl p-3 sm:gap-3
                   bg-white/70 backdrop-blur-md
                   border border-white/30
                   shadow-sm hover:shadow-md transition"
        >

          <img
              :src="getTeamLogo(p.TEAM_ABBR)"
              class="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"
          />

          <img
              :src="getPlayerImage({
                  PLAYER_ID: p.PLAYER_ID,
                  TEAM_ID: p.TEAM_ID
              })"
              :data-player-id="p.PLAYER_ID"
              @error="handleImageError"
              class="h-10 w-10 shrink-0 rounded-lg bg-gray-100 object-cover"
          />

          <div class="min-w-0 flex-1">
            <router-link
                :to="{ name: 'PlayerPage', params: { name: p.name } }"
                class="block text-sm font-semibold truncate text-gray-900 hover:underline"
                style="color: black;"
            >
              {{ p.name }}
            </router-link>

            <div class="text-[10px] text-gray-400">
              {{ formatReason(p.reason) }}
            </div>

            <div
                v-if="p.description"
                class="text-[10px] text-gray-400 mt-0.5"
            >
              {{ p.description }}
            </div>
          </div>

        </div>
      </div>

      <div class="space-y-3">
        <div v-if="homePlayers.length" class="text-xs font-semibold text-gray-500 sm:hidden">
          {{ homeAbbr }}
        </div>

        <div
            v-for="p in homePlayers"
            :key="p.PLAYER_ID"
            class="flex min-w-0 items-center justify-start gap-2 rounded-xl p-3 sm:justify-end sm:gap-3
                   bg-white/70 backdrop-blur-md
                   border border-white/30
                   shadow-sm hover:shadow-md transition"
        >

          <div class="order-3 min-w-0 flex-1 text-left sm:order-none sm:text-right">
            <router-link
                :to="{ name: 'PlayerPage', params: { name: p.name } }"
                class="block text-sm font-semibold truncate text-gray-900 hover:underline"
                style="color: black;"
            >
              {{ p.name }}
            </router-link>

            <div class="text-[10px] text-gray-400">
              {{ formatReason(p.reason) }}
            </div>

            <div
                v-if="p.description"
                class="text-[10px] text-gray-400 mt-0.5"
            >
              {{ p.description }}
            </div>
          </div>

          <img
              :src="getPlayerImage({
                  PLAYER_ID: p.PLAYER_ID,
                  TEAM_ID: p.TEAM_ID
              })"
              :data-player-id="p.PLAYER_ID"
              @error="handleImageError"
              class="order-2 h-10 w-10 shrink-0 rounded-lg bg-gray-100 object-cover sm:order-none"
          />

          <img
              :src="getTeamLogo(p.TEAM_ABBR)"
              class="order-1 h-7 w-7 shrink-0 object-contain sm:order-none sm:h-8 sm:w-8"
          />

        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, type Ref } from 'vue'
import { useGameFinal } from '../../../../composables/NBA/GameFinal/useGameFinal'
import { useGamePlayersStats } from '../../../../composables/NBA/GameFinal/BoxScore/useGamePlayersStats'

import { teamsFullNames } from '../../../../constants/TeamFullName'
import { getPlayerImage, handleImageError } from '../../../../utils/playerImage'

type Filters = {
  search: string
  period: string | number | null
}

const props = defineProps<{
  filters: Filters
}>()

const filtersRef = computed(() => props.filters) as unknown as Ref<Filters>

const { recap } = useGameFinal(filtersRef)
const { inactivePlayers } = useGamePlayersStats(recap)

type InactivePlayer = {
  name: string
  PLAYER_ID: string
  TEAM_ID: string
  TEAM_ABBR: string
  reason: string
  description?: string
}

const homeAbbr = computed(() => recap.value?.meta?.homeAbbr || '')
const awayAbbr = computed(() => recap.value?.meta?.awayAbbr || '')

const enriched = computed<InactivePlayer[]>(() => {
  return inactivePlayers.value.map((p: any) => {
    const isHome = recap.value?.players?.home?.some(
        (x: any) => String(x.personId) === p.PLAYER_ID
    )

    return {
      ...p,
      TEAM_ABBR: isHome ? homeAbbr.value : awayAbbr.value
    }
  })
})

const awayPlayers = computed(() =>
    enriched.value.filter(p => p.TEAM_ABBR === awayAbbr.value)
)

const homePlayers = computed(() =>
    enriched.value.filter(p => p.TEAM_ABBR === homeAbbr.value)
)

function getTeamLogo(abbr: string) {
  return abbr ? `/logos/${abbr}.svg` : '/logos/NBA.svg'
}

function formatReason(reason: string) {
  switch (reason) {
    case 'INACTIVE_INJURY':
      return 'Травма'
    case 'DND_INJURY':
      return 'DNP'
    default:
      return reason
  }
}
</script>
