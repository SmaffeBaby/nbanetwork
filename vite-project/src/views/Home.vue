<template>
  <div class="pt-28 px-8">

    <Header />



    <div class="pt-16 px-6">
      <DailyGamesList />
    </div>
    <div class="pt-16 px-6">
      <RecentGames />
    </div>
    <div class="pt-16 px-6">
      <FavoriteTeamsHome />
    </div>
    <div class="pt-16 px-6">
      <FavoritePlayersHome />
    </div>
    <div class="pt-16 px-6">
      <Map />
    </div>

  </div>
</template>

<script setup lang="ts">
import Header from '../components/Headers/Header.vue'
import DailyGamesList from '../components/NBA/main_slider/DailyGamesList.vue'
import RecentGames from '../components/NBA/recent_games/RecentGames.vue'
import Map from '../components/NBA/MAP/Map.vue'
import FavoriteTeamsHome from '../components/NBA/Favorites/FavoriteTeamsHome.vue'
import FavoritePlayersHome from '../components/NBA/Favorites/FavoritePlayersHome.vue'
</script>
