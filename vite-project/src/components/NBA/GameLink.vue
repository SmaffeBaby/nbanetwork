<template><RouterLink :to="gameLocation(game)" class="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" :aria-label="label || 'Открыть матч'" /></template>
<script setup lang="ts">
import {gameLocation} from '../../api/gameNavigation'
defineProps<{game:any;label?:string}>()
</script>
