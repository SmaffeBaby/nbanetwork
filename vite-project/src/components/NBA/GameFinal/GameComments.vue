<template>
  <section class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Комментарии</h2>
        <p class="text-xs text-gray-500">Обсуждение этой игры</p>
      </div>

      <span
          v-if="unreadCount"
          class="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full"
      >
        {{ unreadCount }}
      </span>
    </div>

    <div class="h-[420px] overflow-y-auto p-4 space-y-4 bg-gray-50">
      <div v-if="!user" class="h-full flex items-center justify-center text-sm text-gray-500">
        Войдите, чтобы читать и отправлять комментарии.
      </div>

      <div v-else-if="loading" class="h-full flex items-center justify-center text-sm text-gray-500">
        Загружаем комментарии...
      </div>

      <div v-else-if="comments.length === 0" class="h-full flex items-center justify-center text-sm text-gray-500">
        Здесь пока тихо. Будьте первым.
      </div>

      <div
          v-for="comment in comments"
          :key="comment.id"
          class="flex gap-3"
      >
        <img
            v-if="comment.profiles?.avatar_img"
            :src="comment.profiles.avatar_img"
            alt="User avatar"
            class="w-10 h-10 rounded-full object-cover shrink-0"
        />
        <div
            v-else
            class="relative inline-flex items-center justify-center w-10 h-10 overflow-hidden bg-gray-100 rounded-full shrink-0"
        >
          <span class="font-medium text-gray-600">
            {{ getInitials(comment) }}
          </span>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-gray-900 truncate">
              {{ getAuthorName(comment) }}
            </span>
            <span class="text-xs text-gray-500 shrink-0">
              {{ formatTime(comment.created_at) }}
            </span>
          </div>

          <div class="mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <p v-if="comment.message" class="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {{ comment.message }}
            </p>

            <img
                v-if="comment.image_data"
                :src="comment.image_data"
                alt="Comment attachment"
                class="mt-3 max-h-72 rounded-lg object-contain border border-gray-100"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-gray-200 bg-white">
      <p v-if="error" class="mb-2 text-sm text-red-600">{{ error }}</p>

      <div
          v-if="imageData"
          class="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2"
      >
        <img :src="imageData" alt="Selected attachment" class="w-14 h-14 rounded object-cover" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900">{{ imageName }}</p>
          <p class="text-xs text-gray-500">Изображение будет отправлено с сообщением</p>
        </div>
        <button
            type="button"
            @click="removeImage"
            class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          Убрать
        </button>
      </div>

      <div class="flex items-end gap-2">
        <label
            class="inline-flex items-center justify-center w-10 h-10 text-gray-500 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200"
            title="Прикрепить изображение"
        >
          <input
              type="file"
              accept="image/*"
              class="hidden"
              :disabled="!user || sending"
              @change="attachImage"
          />
          <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 18">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 12.5 8 10l-3 3.5M19 4v10a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3ZM14.5 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/>
          </svg>
        </label>

        <textarea
            v-model="message"
            rows="2"
            :disabled="!user || sending"
            class="block flex-1 resize-none rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Напишите комментарий..."
            @focus="markAsRead"
        />

        <button
            type="button"
            :disabled="!canSend || sending"
            @click="sendComment"
            class="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ sending ? '...' : 'Отправить' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRef, watch } from 'vue'
import { useGameComments, type GameComment } from '../../../composables/NBA/GameFinal/useGameComments'

const props = defineProps<{
  gameId: string
  active: boolean
}>()

const emit = defineEmits<{
  unreadChange: [count: number]
}>()

const {
  user,
  comments,
  message,
  imageData,
  imageName,
  loading,
  sending,
  unreadCount,
  error,
  canSend,
  attachImage,
  removeImage,
  sendComment,
  markAsRead,
  fetchComments,
  fetchUnreadCount
} = useGameComments(toRef(props, 'gameId'))

const formatTime = (date: string) => {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date))
}

const getAuthorName = (comment: GameComment) => {
  const first = comment.profiles?.first_name ?? ''
  const last = comment.profiles?.last_name ?? ''
  const name = `${first} ${last}`.trim()

  return name || 'Пользователь'
}

const getInitials = (comment: GameComment) => {
  const first = comment.profiles?.first_name?.trim().charAt(0) ?? ''
  const last = comment.profiles?.last_name?.trim().charAt(0) ?? ''
  const initials = `${first}${last}`.trim()

  return initials || 'U'
}

watch(unreadCount, (count) => {
  emit('unreadChange', count)
}, { immediate: true })

watch(
  () => props.active,
  async (active) => {
    if (!active) return

    await fetchComments()
    await markAsRead()
    await fetchUnreadCount()
  },
  { immediate: true }
)
</script>
