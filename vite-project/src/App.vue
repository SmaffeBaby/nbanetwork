<template>
  <router-view />
  <AppFooter />
  <CookieConsent />
</template>

<script setup lang="ts">
import AppFooter from './components/Layout/AppFooter.vue'
import CookieConsent from './components/Layout/CookieConsent.vue'
</script>
