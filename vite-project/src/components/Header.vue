<template>
  <header class="hidden sm:flex w-full bg-white border border-gray-200 shadow-lg fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl max-w-7xl px-3 py-2">
    <div class="flex items-center gap-2 w-full">

      <RouterLink to="/">
        <img src="/logos/logo-nba-mom.svg" alt="NBA Logo" class="w-10 h-10 md:w-56 object-contain"/>
      </RouterLink>

      <div class="ml-auto w-auto">
        <AuthPanel />
      </div>
    </div>
  </header>

  <HeaderBurger />
</template>

<script setup lang="ts">
import AuthPanel from './Auth/AuthPanel.vue'
import HeaderBurger from './HeaderBurger.vue'
</script>