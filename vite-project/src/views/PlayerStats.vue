<template>
  <div class="pt-28 px-8">
    <Header />
    <div class="pt-16 px-6">
      <PlayerStats />
    </div>
  </div>
</template>

<script setup lang="ts">
import PlayerStats from '../components/NBA/player_stats/PlayerStats.vue'
import Header from "../components/Headers/Header.vue";
</script>