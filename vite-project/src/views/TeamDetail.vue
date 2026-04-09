<template>
  <div class="pt-28 px-8">
    <Header />
    <div class="pt-16 px-6">
      <TeamDetailComponent />
    </div>
  </div>
</template>

<script setup lang="ts">
import TeamDetailComponent from '../components/NBA/Teams/TeamsDetail/TeamDetail.vue'
import Header from "../components/Headers/Header.vue";
</script>