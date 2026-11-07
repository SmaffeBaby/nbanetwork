<template>
  <RouterLink v-if="team?.localLogo" :to="`/team/${team.abbr}`" class="inline-flex items-center gap-2 font-bold text-slate-700 hover:text-blue-600">
    <img :src="`/logos/${team.abbr}.svg`" alt="" class="h-8 w-8 shrink-0 object-contain" loading="lazy" />
    <span>{{ team.name }}</span>
  </RouterLink>
  <span v-else class="text-slate-500">{{ team?.name || 'Команда уточняется' }}</span>
</template>
<script setup lang="ts">
import type { DraftTeam } from '../../../types/draft'
defineProps<{ team: DraftTeam | null }>()
</script>
