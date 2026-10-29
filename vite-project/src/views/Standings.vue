<template>
  <Header />
  <main class="mx-auto w-full max-w-7xl px-3 pb-12 pt-24 sm:px-6 sm:pt-28 lg:px-8">
    <Standings />
  </main>
</template>

<script setup lang="ts">
import Standings from '../components/NBA/Standings/Standings.vue'
import Header from '../components/Headers/Header.vue'
</script>
