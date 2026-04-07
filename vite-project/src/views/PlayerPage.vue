<template>
  <div class="pt-28 px-8">
    <Header />
    <div class="pt-16 px-6">
      <PlayerPageContent />
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from "../components/Headers/Header.vue";
import PlayerPageContent from "../components/NBA/player_stats/detail_stats/PlayerPage.vue";
</script>