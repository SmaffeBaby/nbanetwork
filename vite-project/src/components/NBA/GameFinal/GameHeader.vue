<template>
  <div class="space-y-6">

    <div v-if="loading">Loading game...</div>

    <div v-else-if="error" class="text-red-500">
      {{ error }}
    </div>

    <div v-else class="p-6 border rounded-xl flex items-center justify-between">

      <div class="flex flex-col items-center w-1/3">
        <img
            :src="getTeamLogo(game?.home?.abbr)"
            class="w-14 h-14 cursor-pointer"
            @click="goTeam(game?.home?.abbr)"
        />
        <div class="font-bold mt-2">
          {{ game?.home?.name }}
        </div>
      </div>

      <div class="text-center">
        <div class="text-3xl font-bold">
          {{ game?.home?.score }} - {{ game?.away?.score }}
        </div>

        <div class="text-sm text-gray-500">
          {{ game?.status }}
        </div>

        <div class="text-xs text-gray-400 mt-1">
          {{ game?.dateMSK }}
        </div>
      </div>

      <div class="flex flex-col items-center w-1/3">
        <img
            :src="getTeamLogo(game?.away?.abbr)"
            class="w-14 h-14 cursor-pointer"
            @click="goTeam(game?.away?.abbr)"
        />
        <div class="font-bold mt-2">
          {{ game?.away?.name }}
        </div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { getTeamLogo } from '../../../utils/getTeamLogo'

defineProps<{
  game: any
  loading: boolean
  error: string | null
}>()

const router = useRouter()

function goTeam(abbr: string) {
  if (!abbr) return
  router.push(`/team/${abbr}`)
}
</script>