<template>
  <img :key="imageId" :src="getPlayerImage({ PLAYER_ID: imageId }, period)" :data-player-id="imageId" alt="" loading="lazy" class="h-10 w-10 shrink-0 rounded-full object-cover" @error="handleImageError" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPlayerImage, handleImageError } from '../../utils/playerImage'

const props = defineProps<{ playerId?: string | number | null; name?: string; period?: string }>()
import { findPhotoPlayer } from '../../utils/playerPhotoIdentity'
const identity = useQuery({
  queryKey: computed(() => ['player-photo-nba-identity', props.name]),
  enabled: computed(() => Boolean(props.name)),
  queryFn: async ({ signal }) => {
    const response = await fetch(`/api/players/search?q=${encodeURIComponent(props.name || '')}`, { signal })
    if (!response.ok) throw new Error('Player lookup unavailable')
    const data = await response.json() as { data: { PLAYER_ID: number; PLAYER_NAME: string }[] }
    return findPhotoPlayer(data.data, props.name || '')
  },
  staleTime: 86400000, retry: false
})
// Match the profile's NBA photo first. Legacy ESPN draft IDs may identify college prospects.
const imageId = computed(() => props.name && identity.isPending.value
  ? undefined
  : identity.data.value || props.playerId || undefined)
</script>
