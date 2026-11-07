<template>
  <RouterLink v-if="person.kind==='player'" :to="{name:'PlayerPage',params:{name:person.name}}" class="inline-flex items-center gap-3 font-bold text-slate-800 hover:text-blue-600">
    <PlayerPhoto :player-id="person.photoId" :name="person.name" /><span>{{ person.name }}</span>
  </RouterLink>
  <RouterLink v-else-if="person.kind==='team' && person.abbr" :to="`/team/${person.abbr}`" class="inline-flex items-center gap-3 font-bold text-slate-800 hover:text-blue-600">
    <img :src="`/logos/${person.abbr}.svg`" alt="" class="h-9 w-9 shrink-0 object-contain" /><span>{{ person.name }}</span>
  </RouterLink>
  <a v-else-if="person.sourceUrl" :href="person.sourceUrl" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-800 hover:text-blue-600">{{ person.name }} ↗</a>
  <span v-else class="font-bold text-slate-800">{{ person.name }}</span>
</template>
<script setup lang="ts">
import PlayerPhoto from '../PlayerPhoto.vue'
import type { AwardEntity } from '../../../types/seasonAwards'
defineProps<{person:AwardEntity}>()
</script>
