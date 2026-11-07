<template>
  <RouterLink v-if="person.kind==='player'" :to="{name:'PlayerPage',params:{name:person.name}}" class="inline-flex items-center gap-3 font-bold text-slate-800 hover:text-blue-600">
    <PlayerPhoto :player-id="person.photoId" :name="person.name" /><span>{{ person.name }}</span>
  </RouterLink>
  <RouterLink v-else-if="person.kind==='team' && person.abbr" :to="`/team/${person.abbr}`" class="inline-flex items-center gap-3 font-bold text-slate-800 hover:text-blue-600">
    <img :src="`/logos/${person.abbr}.svg`" alt="" class="h-9 w-9 shrink-0 object-contain" /><span>{{ person.name }}</span>
  </RouterLink>
  <RouterLink v-else-if="(person.kind==='coach' || person.kind==='executive') && staffId" :to="staffLocation(person.kind,staffId,season)" class="inline-flex items-center gap-3 font-bold text-slate-800 hover:text-blue-600"><StaffPhoto :role="person.kind" :id="staffId" :period="season" /><span>{{ person.name }}</span></RouterLink>
  <span v-else class="font-bold text-slate-800">{{ person.name }}</span>
</template>
<script setup lang="ts">
import PlayerPhoto from '../PlayerPhoto.vue'
import StaffPhoto from '../Staff/StaffPhoto.vue'
import {computed} from 'vue'
import {staffLocation} from '../../../types/staff'
import type { AwardEntity } from '../../../types/seasonAwards'
const props=defineProps<{person:AwardEntity;season?:string}>()
const staffId=computed(()=>props.person.id || /\/(?:coaches|executives)\/([a-z0-9]+)\.html/.exec(props.person.sourceUrl || '')?.[1])
</script>
