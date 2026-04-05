<template>
  <div class="pt-28 px-8">
    <Header />

    <div class="min-h-screen bg-gray-50 flex flex-col md:flex-row">

      <ProfileSidebar
          :activeTab="activeTab"
          @changeTab="(tab) => activeTab = tab"
      />

      <div class="flex-1 flex justify-center py-6 md:py-10 px-3 md:px-6">
        <div class="w-full max-w-2xl bg-white rounded-2xl shadow-md md:shadow-lg p-4 md:p-8 space-y-6">

          <template v-if="activeTab === 'main'">

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 class="text-xl md:text-2xl font-bold">Основные</h1>

              <button
                  @click="isEditing = !isEditing"
                  class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
              >
                {{ isEditing ? 'Отмена' : 'Редактировать' }}
              </button>
            </div>

            <div class="space-y-4 md:space-y-5">

              <div>
                <label class="text-sm text-gray-500">Email</label>
                <input
                    :value="user?.email"
                    disabled
                    class="w-full mt-1 px-3 py-2 border rounded-lg bg-gray-100 text-sm md:text-base"
                />
              </div>

              <div>
                <label class="text-sm text-gray-500">Имя</label>
                <input
                    v-model="form.firstName"
                    :disabled="!isEditing"
                    class="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm md:text-base"
                />
              </div>

              <div>
                <label class="text-sm text-gray-500">Фамилия</label>
                <input
                    v-model="form.lastName"
                    :disabled="!isEditing"
                    class="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm md:text-base"
                />
              </div>

            </div>

            <div class="flex flex-col sm:flex-row gap-3 pt-2 md:pt-4">
              <button
                  v-if="isEditing"
                  @click="saveProfile"
                  :disabled="loadingSave"
                  class="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              >
                {{ loadingSave ? 'Сохранение...' : 'Сохранить' }}
              </button>

              <button
                  @click="logoutAndRedirect"
                  class="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Выйти
              </button>
            </div>

          </template>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProfile } from '../composables/Profile/useProfile'
import ProfileSidebar from '../components/Profile/ProfileSidebar.vue'
import Header from "../components/Headers/Header.vue"

const {
  user,
  activeTab,
  isEditing,
  loadingSave,
  form,
  saveProfile,
  logoutAndRedirect
} = useProfile()
</script>