<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

    <div class="bg-white rounded-2xl p-6 w-80">

      <h2 class="text-xl font-bold mb-2">
        {{ player.PLAYER_NAME }}
      </h2>

      <p class="text-gray-500 mb-4">
        {{ player.TEAM_ABBREVIATION }}
      </p>

      <div class="grid grid-cols-2 gap-2 text-sm">

        <div>PPG: {{ player.PTS }}</div>
        <div>RPG: {{ player.REB }}</div>
        <div>APG: {{ player.AST }}</div>
        <div>SPG: {{ player.STL }}</div>
        <div>BPG: {{ player.BLK }}</div>
        <div>TOV: {{ player.TOV }}</div>

      </div>

      <button
          class="mt-4 w-full bg-black text-white p-2 rounded"
          @click="$emit('close')"
      >
        Close
      </button>

    </div>

  </div>
</template>

<script setup lang="ts">
defineProps<{ player: any }>()
</script>