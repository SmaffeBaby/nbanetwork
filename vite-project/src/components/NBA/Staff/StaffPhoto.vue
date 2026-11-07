<template>
  <img :key="`${role}:${id}:${period}`" :src="playerImageUrl(`staff:${role}:${id}`,period)" alt="" loading="lazy" class="h-12 w-12 shrink-0 rounded-xl bg-slate-50 object-cover" @error="handleImageError" />
</template>
<script setup lang="ts">
import {playerImageUrl,handleImageError} from '../../../utils/playerImage'
import type {StaffRole} from '../../../types/staff'
defineProps<{role:StaffRole;id:string;period?:string}>()
</script>
