<template>
  <div class="relative min-h-screen overflow-x-hidden pt-32 px-4 sm:pt-48 sm:px-8">
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
          class="absolute inset-0 bg-cover bg-top opacity-45"
          style="background-image: url('https://flowbite.s3.amazonaws.com/docs/jumbotron/hero-pattern.svg')"
      ></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_12%_6%,rgba(239,68,68,0.15),transparent_30%),radial-gradient(circle_at_88%_10%,rgba(37,99,235,0.17),transparent_34%),linear-gradient(180deg,#ffffff_0%,#eff6ff_26%,#ffffff_62%)]"></div>
    </div>

    <Header />

    <div class="relative z-40">
      <HomeSearchHero />
    </div>

    <div class="relative z-0 pt-16 px-2 sm:px-6">
      <NewsSlider />
    </div>

    <div class="relative z-0 pt-16 px-2 sm:px-6">
      <DailyGamesList />
    </div>
    <div class="relative z-0 pt-16 px-2 sm:px-6">
      <RecentGames />
    </div>
    <div class="relative z-0 pt-16 px-2 sm:px-6">
      <FavoriteTeamsHome />
    </div>
    <div class="relative z-0 pt-16 px-2 sm:px-6">
      <FavoritePlayersHome />
    </div>
    <div id="map" class="relative z-0 scroll-mt-28 pt-16 px-2 sm:px-6">
      <Map />
    </div>

  </div>
</template>

<script setup lang="ts">
import Header from '../components/Headers/Header.vue'
import HomeSearchHero from '../components/Home/HomeSearchHero.vue'
import NewsSlider from '../components/News/NewsSlider.vue'
import DailyGamesList from '../components/NBA/main_slider/DailyGamesList.vue'
import RecentGames from '../components/NBA/recent_games/RecentGames.vue'
import Map from '../components/NBA/MAP/Map.vue'
import FavoriteTeamsHome from '../components/NBA/Favorites/FavoriteTeamsHome.vue'
import FavoritePlayersHome from '../components/NBA/Favorites/FavoritePlayersHome.vue'
</script>
