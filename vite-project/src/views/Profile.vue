<template>
  <div class="pt-28 px-8">
    <Header />

    <div class="pt-16 px-6">
      <div class="min-h-screen bg-gray-50 flex flex-col md:flex-row">

        <ProfileSidebar
            :activeTab="activeTab"
            @changeTab="(tab) => activeTab = tab"
        />

        <div class="flex-1 flex justify-center py-6 md:py-10 px-3 md:px-6">
          <div class="w-full max-w-2xl bg-white rounded-2xl shadow-md md:shadow-lg p-4 md:p-8 space-y-6">

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
