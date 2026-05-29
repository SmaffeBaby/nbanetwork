<template>
  <template v-if="activeTab === 'main'">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="m-0 text-xl font-bold md:text-2xl">Основные</h1>

      <div class="flex flex-col gap-2 sm:flex-row">
        <RouterLink
            v-if="user"
            :to="{ name: 'PublicProfile', params: { id: user.id } }"
            class="rounded-xl bg-gradient-to-r from-teal-200 to-lime-200 px-4 py-2.5 text-center text-sm font-medium leading-5 text-heading hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:outline-none focus:ring-4 focus:ring-lime-200 dark:focus:ring-teal-700"
        >
          Посмотреть профиль
        </RouterLink>

        <button
            @click="isEditing = !isEditing"
            class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
        >
          {{ isEditing ? 'Отмена' : 'Редактировать' }}
        </button>
      </div>
    </div>

    <div class="space-y-4 md:space-y-5">

      <div class="rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:border-0 sm:bg-transparent sm:p-0">
        <label class="text-sm text-gray-500">Аватарка</label>
        <div class="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <img
              v-if="user?.avatarImg"
              :src="user.avatarImg"
              alt="User avatar"
              class="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200"
          />
          <div
              v-else
              class="relative inline-flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-200"
          >
            <span class="font-medium text-2xl text-gray-600">{{ userInitials }}</span>
          </div>

          <div class="w-full flex-1">
            <input
                type="file"
                accept="image/*"
                :disabled="loadingAvatar"
                @change="uploadAvatar"
                class="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:bg-gray-50"
            />
            <p class="mt-1 text-xs text-gray-500">
              {{ loadingAvatar ? 'Загрузка...' : 'PNG, JPG или WEBP до 1 МБ' }}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label class="text-sm text-gray-500">Email</label>
        <input
            :value="user?.email"
            disabled
            class="mt-1 w-full rounded-lg border bg-gray-100 px-3 py-2 text-sm md:text-base"
        />
      </div>

      <div>
        <label class="text-sm text-gray-500">Имя</label>
        <input
            v-model="form.firstName"
            :disabled="!isEditing"
            class="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 md:text-base"
        />
      </div>

      <div>
        <label class="text-sm text-gray-500">Фамилия</label>
        <input
            v-model="form.lastName"
            :disabled="!isEditing"
            class="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 md:text-base"
        />
      </div>

      <ProfileFavoriteTeams />

      <ProfileSubscriptions />

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

  <ProfileLikedArticles v-else-if="activeTab === 'likedArticles'" />
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { RouterLink } from 'vue-router'
import { useProfile } from '../../composables/Profile/useProfile'
import ProfileFavoriteTeams from './ProfileFavoriteTeams.vue'
import ProfileSubscriptions from './ProfileSubscriptions.vue'
import ProfileLikedArticles from './ProfileLikedArticles.vue'

const props = defineProps({
  activeTab: String
})

const {
  user,
  isEditing,
  loadingSave,
  loadingAvatar,
  form,
  saveProfile,
  uploadAvatar,
  logoutAndRedirect
} = useProfile()

const activeTab = toRef(props, 'activeTab')

const userInitials = computed(() => {
  const first = user.value?.firstName?.trim().charAt(0) ?? ''
  const last = user.value?.lastName?.trim().charAt(0) ?? ''
  const initials = `${first}${last}`.trim()

  return initials || 'U'
})
</script>
