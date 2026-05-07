<template>
  <div
      class="relative overflow-hidden rounded-2xl shadow-xl group cursor-pointer
           transition-all duration-500 hover:scale-[1.04] hover:shadow-2xl"
      :style="{ backgroundColor: getTeamStyle(team).bgColorHex }"
      @click="emit('select', team)"
  >
    <FavoriteTeamButton
        :teamAbbr="teamAbbr"
        class="absolute right-4 top-4 z-20"
    />

    <img
        v-if="getTeamStyle(team).bgSvg"
        :src="getTeamStyle(team).bgSvg"
        class="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20"
    />

    <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

    <div class="relative z-10 p-8 flex flex-col items-center">
      <img
          :src="getLogo(team)"
          :alt="getFullName(team)"
          class="w-52 h-52 mb-4 drop-shadow-2xl transition group-hover:scale-125"
      />

      <h3 class="text-xl font-bold text-white text-center">
        {{ getFullName(team) }}
      </h3>

      <span class="mt-4 px-5 py-2 bg-white text-black rounded-full font-bold">
        {{ getRecord(team) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FavoriteTeamButton from '../Favorites/FavoriteTeamButton.vue'
import { getTeamAbbr } from '../../../composables/NBA/Teams/useTeamUtils'

interface Props {
  team: any
  getLogo: (team: any) => string
  getFullName: (team: any) => string
  getRecord: (team: any) => string
  getTeamStyle: (team: any) => { bgColorHex: string; bgSvg?: string }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', team: any): void
}>()

const { team, getLogo, getFullName, getRecord, getTeamStyle } = props
const teamAbbr = computed(() => getTeamAbbr(team))
</script>
