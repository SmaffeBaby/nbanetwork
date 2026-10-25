<template>
  <section class="space-y-3">
    <div>
      <h2 class="text-lg font-bold text-gray-900">Мои подписки</h2>
      <p class="text-sm leading-5 text-gray-500">Профили, по комментариям которых можно получать уведомления.</p>
    </div>

    <div v-if="error" role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
      {{ error }}
      <button type="button" class="ml-2 font-semibold underline" @click="retry">Повторить</button>
    </div>
    <p v-if="loading" class="text-sm text-gray-500">Загружаем подписки...</p>

    <div
        v-if="profiles.length"
        class="space-y-2"
    >
      <div
          v-for="profile in profiles"
          :key="profile.id"
          class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center"
      >
        <img
            v-if="profile.avatar_img"
            :src="profile.avatar_img"
            alt="User avatar"
            class="h-10 w-10 rounded-full object-cover"
        />
        <div
            v-else-if="!loading && !error"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600"
        >
          {{ getInitials(profile) }}
        </div>

        <RouterLink
            :to="{ name: 'PublicProfile', params: { id: profile.id } }"
            class="min-w-0 flex-1 text-center sm:text-left"
        >
          <div class="truncate text-sm font-semibold text-gray-900 hover:text-blue-600">
            {{ getName(profile) }}
          </div>
          <div class="text-xs text-gray-500">Публичный профиль</div>
        </RouterLink>

        <button
            type="button"
            class="w-full rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 active:scale-95 sm:w-auto"
            :disabled="pending.includes(profile.id)"
            @click="unfollow(profile.id)"
        >
          {{ pending.includes(profile.id) ? 'Сохраняем...' : 'Отписаться' }}
        </button>
      </div>
    </div>

    <div
        v-else-if="!loading && !error"
        class="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm text-gray-500"
    >
      Вы пока ни на кого не подписаны.
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useProfileFollows, type SubscriptionProfile } from '../../composables/Profile/useProfileFollows'

const { profiles, loading, error, retry, pending, setFollowing } = useProfileFollows()
const unfollow = (id: string) => setFollowing(id, false)
const getName = (profile: SubscriptionProfile) => `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Пользователь'
const getInitials = (profile: SubscriptionProfile) => `${profile.first_name?.trim().charAt(0) ?? ''}${profile.last_name?.trim().charAt(0) ?? ''}` || 'U'
</script>
