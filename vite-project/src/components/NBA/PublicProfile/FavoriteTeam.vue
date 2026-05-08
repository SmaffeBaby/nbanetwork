<template>
  <section class="space-y-4">
    <h2 class="text-2xl font-black text-gray-900">Любимые команды</h2>

    <div
        v-if="favoriteTeams.length"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <button
          v-for="team in favoriteTeams"
          :key="team.abbr"
          type="button"
          class="group relative overflow-hidden rounded-2xl p-5 text-left text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
          :style="{ backgroundColor: team.bgColor }"
          @click="emit('select', team.abbr)"
      >
        <img
            v-if="team.bgSvg"
            :src="team.bgSvg"
            :alt="`${team.name} background`"
            class="absolute inset-0 h-full w-full object-cover opacity-10 transition group-hover:opacity-20"
        >

        <div class="absolute inset-0 bg-gradient-to-br from-black/55 via-black/20 to-black/60" />

        <div class="relative z-10 flex items-center gap-4">
          <img
              :src="team.logo"
              :alt="team.name"
              class="h-20 w-20 object-contain drop-shadow-2xl transition group-hover:scale-110"
          >

          <div>
            <div class="text-sm font-semibold text-white/70">
              {{ team.abbr }}
            </div>
            <div class="text-xl font-black leading-tight">
              {{ team.name }}
            </div>
          </div>
        </div>
      </button>
    </div>

    <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500"
    >
      Пользователь пока не выбрал любимые команды.
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useFavoriteTeam } from '../../../composables/NBA/PublicProfile/useFavoriteTeam'

const props = defineProps<{
  teams: string[] | null | undefined
}>()

const emit = defineEmits<{
  select: [abbr: string]
}>()

const { favoriteTeams } = useFavoriteTeam(toRef(props, 'teams'))
</script>