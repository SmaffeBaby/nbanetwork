<template>
  <div class="pt-24 px-3 sm:pt-28 sm:px-8">
    <Header />

    <div class="pt-12 sm:pt-16 sm:px-6">
      <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 bg-gray-50 md:flex-row md:gap-0">

        <ProfileSidebar
            :activeTab="activeTab"
            @changeTab="(tab) => activeTab = tab"
        />

        <div class="flex flex-1 justify-center md:px-6 md:py-10">
          <div class="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-md md:p-8 md:shadow-lg">

            <ProfileMain :activeTab="activeTab" />

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProfile } from '../composables/Profile/useProfile'
import ProfileSidebar from '../components/Profile/ProfileSidebar.vue'
import ProfileMain from '../components/Profile/ProfileMain.vue'
import Header from "../components/Headers/Header.vue"

const {
  activeTab
} = useProfile()
</script>
