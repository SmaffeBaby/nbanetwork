<template>
  <div class="pt-24 px-3 sm:pt-28 sm:px-8">
    <Header />
    <div class="pt-12 sm:pt-16 sm:px-6">
      <TeamDetailComponent />
    </div>
  </div>
</template>

<script setup lang="ts">
import TeamDetailComponent from '../components/NBA/Teams/TeamsDetail/TeamDetail.vue'
import Header from "../components/Headers/Header.vue";
</script>