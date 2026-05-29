<template>
  <div class="pt-24 px-3 sm:pt-28 sm:px-8">
    <Header />
    <div class="pt-12 sm:pt-16 sm:px-6">
      <PlayerPageContent />
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from "../components/Headers/Header.vue";
import PlayerPageContent from "../components/NBA/player_stats/detail_stats/PlayerPage.vue";
</script>