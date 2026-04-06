<template>
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
</template>

<script setup lang="ts">
import { useProfile } from '../../composables/Profile/useProfile'

const props = defineProps({
  activeTab: String
})

const {
  user,
  isEditing,
  loadingSave,
  form,
  saveProfile,
  logoutAndRedirect
} = useProfile()

const { activeTab } = props
</script>
