<template>
  <div v-if="user" class="relative">
    <button
        type="button"
        title="Уведомления"
        class="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
        @click="toggleOpen"
    >
      <BellIcon class="h-6 w-6" />
      <span
          v-if="unreadCount"
          class="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
      >
        {{ unreadCount }}
      </span>
    </button>

    <div
        v-if="open"
        class="absolute right-0 z-[100] mt-3 flex w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-20 max-sm:mt-0 max-sm:max-h-[calc(100svh-6rem)] max-sm:w-auto max-sm:max-w-none"
    >
      <div class="border-b border-gray-100 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-sm font-bold text-gray-900">Уведомления</h2>
            <p class="text-xs leading-4 text-gray-500">Комментарии и статьи от пользователей, на которых вы подписаны</p>
          </div>

          <label class="inline-flex shrink-0 cursor-pointer items-center gap-2">
            <input
                type="checkbox"
                class="sr-only peer"
                :checked="user.notifyFollowedComments"
                @change="toggleNotify"
            />
            <span class="relative h-6 w-11 rounded-full bg-gray-200 transition after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:bg-blue-600 peer-checked:after:translate-x-5"></span>
          </label>
        </div>

        <div class="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          Подписки: {{ followsCount }}. Уведомления создаются даже если сайт закрыт.
        </div>

        <button
            v-if="notifications.length"
            type="button"
            class="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 active:scale-95"
            @click="clearNotifications"
        >
          Очистить уведомления
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        <RouterLink
            v-for="notification in notifications"
            :key="notification.id"
            :to="notification.to"
            class="flex min-w-0 gap-3 rounded-xl p-3 transition hover:bg-gray-50"
            @click="open = false"
        >
          <img
              v-if="notification.avatarImg"
              :src="notification.avatarImg"
              alt="User avatar"
              class="h-10 w-10 shrink-0 rounded-full object-cover"
          />
          <div
              v-else
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600"
          >
            {{ notification.userName.charAt(0) || 'U' }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-gray-900">{{ notification.userName }}</span>
              <span
                  v-if="!notification.readAt"
                  class="h-2 w-2 rounded-full bg-blue-500"
              ></span>
            </div>
            <p class="mt-0.5 break-words text-xs leading-4 text-gray-600">
              {{ notification.message }} {{ formatTime(notification.createdAt) }}
            </p>
            <p class="mt-1 truncate text-xs font-medium text-gray-500">
              {{ notification.gameLabel }}
            </p>
          </div>
        </RouterLink>

        <div
            v-if="notifications.length === 0"
            class="p-6 text-center text-sm text-gray-500"
        >
          Пока нет уведомлений.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { BellIcon } from '@heroicons/vue/24/outline'
import { useNotificationsBell } from '../../composables/Headers/useNotificationsBell'

const {
  clearNotifications,
  followsCount,
  formatTime,
  notifications,
  open,
  toggleNotify,
  toggleOpen,
  unreadCount,
  user
} = useNotificationsBell()
</script>
