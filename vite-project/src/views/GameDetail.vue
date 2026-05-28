<template>
  <div class="px-3 pt-24 sm:px-6 lg:px-8 lg:pt-28">
    <Header />

    <div class="mx-auto w-full max-w-6xl pt-6 text-left sm:pt-10 lg:pt-16">
      <GameFinal />
    </div>
  </div>
</template>

<script setup lang="ts">
import GameFinal from '../components/NBA/GameFinal/GameFinal.vue'
import Header from '../components/Headers/Header.vue'
</script>
