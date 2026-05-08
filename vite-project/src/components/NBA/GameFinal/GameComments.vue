<template>
  <section class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <div>
        <h2 class="text-base font-semibold text-gray-900">Комментарии</h2>
        <p class="text-xs text-gray-500">Обсуждение этой игры</p>
      </div>

      <span
          v-if="unreadCount"
          class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
      >
        {{ unreadCount }}
      </span>
    </div>

    <div class="h-[420px] overflow-y-auto bg-gray-50 p-4">
      <div v-if="!user" class="flex h-full items-center justify-center text-sm text-gray-500">
        Войдите, чтобы читать и отправлять комментарии.
      </div>

      <div v-else-if="loading" class="flex h-full items-center justify-center text-sm text-gray-500">
        Загружаем комментарии...
      </div>

      <div v-else-if="comments.length === 0" class="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
        Здесь пока тихо. Будьте первым. Все комментарии удалятся через 4 дня.
      </div>

      <div v-else class="space-y-4">
        <div
            v-for="comment in comments"
            :key="comment.id"
            :id="`comment-${comment.id}`"
            class="group flex w-full items-start gap-2.5"
            :class="isOwnComment(comment) ? 'justify-end' : 'justify-start'"
        >
          <RouterLink
              v-if="!isOwnComment(comment)"
              :to="{ name: 'PublicProfile', params: { id: comment.user_id } }"
              class="shrink-0"
          >
            <img
                v-if="comment.profiles?.avatar_img"
                :src="comment.profiles.avatar_img"
                alt="User avatar"
                class="h-8 w-8 rounded-full object-cover"
            />
            <div
                v-else
                class="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-200"
            >
              <span class="text-xs font-medium text-gray-600">
                {{ getInitials(comment) }}
              </span>
            </div>
          </RouterLink>

          <div
              class="flex w-fit max-w-[min(82%,32rem)] flex-col gap-1"
              :class="isOwnComment(comment) ? 'items-end' : 'items-start'"
          >
            <div
                class="flex items-center gap-2"
                :class="isOwnComment(comment) ? 'justify-end' : ''"
            >
              <RouterLink
                  :to="{ name: 'PublicProfile', params: { id: comment.user_id } }"
                  class="truncate text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
              >
                {{ getAuthorName(comment) }}
              </RouterLink>
              <span class="shrink-0 text-xs font-normal text-gray-500">
                {{ formatTime(comment.created_at) }}
              </span>
            </div>

            <div
                class="leading-1.5 flex w-fit max-w-full flex-col rounded-e-xl rounded-es-xl border-gray-200 p-4"
                :class="isOwnComment(comment)
                  ? 'rounded-s-xl rounded-ee-xl rounded-es-none bg-blue-700 text-white'
                  : 'bg-white text-gray-900 shadow-sm'"
            >
              <button
                  v-if="getReplyTarget(comment)"
                  type="button"
                  class="mb-3 rounded-lg border-l-4 px-3 py-2 text-left"
                  :class="isOwnComment(comment)
                    ? 'border-blue-200 bg-blue-600/70 text-blue-50'
                    : 'border-blue-500 bg-gray-50 text-gray-700'"
                  @click="scrollToComment(comment.reply_to_id)"
              >
                <span class="block text-xs font-semibold">
                  Ответ {{ getAuthorName(getReplyTarget(comment)!) }}
                </span>
                <span class="mt-0.5 block truncate text-xs opacity-90">
                  {{ getReplyPreview(getReplyTarget(comment)!) }}
                </span>
              </button>

              <p v-if="comment.message" class="whitespace-pre-wrap break-words text-sm font-normal">
                {{ comment.message }}
              </p>

              <img
                  v-if="comment.image_data"
                  :src="comment.image_data"
                  alt="Comment attachment"
                  class="mt-3 max-h-72 rounded-lg border object-contain"
                  :class="isOwnComment(comment) ? 'border-blue-500' : 'border-gray-100'"
              />
            </div>

            <div
                class="flex items-center gap-3 text-xs"
                :class="isOwnComment(comment) ? 'justify-end' : ''"
            >
              <button
                  type="button"
                  class="font-medium text-gray-500 hover:text-blue-700"
                  @click="setReplyTo(comment)"
              >
                Ответить
              </button>
              <button
                  v-if="canDeleteComment(comment)"
                  type="button"
                  :disabled="deleting"
                  class="font-medium text-gray-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="deleteComment(comment)"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 bg-white p-4">
      <p v-if="error" class="mb-2 text-sm text-red-600">{{ error }}</p>

      <div
          v-if="replyTo"
          class="mb-3 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3"
      >
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-blue-800">
            Ответ {{ getAuthorName(replyTo) }}
          </p>
          <p class="mt-0.5 truncate text-sm text-blue-900">
            {{ getReplyPreview(replyTo) }}
          </p>
        </div>
        <button
            type="button"
            class="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
            @click="clearReplyTo"
        >
          Сбросить
        </button>
      </div>

      <div
          v-if="imageData"
          class="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2"
      >
        <img :src="imageData" alt="Selected attachment" class="h-14 w-14 rounded object-cover" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900">{{ imageName }}</p>
          <p class="text-xs text-gray-500">Изображение будет отправлено с сообщением</p>
        </div>
        <button
            type="button"
            @click="removeImage"
            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Убрать
        </button>
      </div>

      <div class="flex items-end gap-2">
        <label
            class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
            title="Прикрепить изображение"
        >
          <input
              type="file"
              accept="image/*"
              class="hidden"
              :disabled="!user || sending"
              @change="attachImage"
          />
          <svg class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 18">
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
            class="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ sending ? '...' : 'Отправить' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
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
  replyTo,
  loading,
  sending,
  deleting,
  unreadCount,
  error,
  canSend,
  attachImage,
  removeImage,
  setReplyTo,
  clearReplyTo,
  sendComment,
  deleteComment,
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

const isOwnComment = (comment: GameComment) => comment.user_id === user.value?.id

const canDeleteComment = (comment: GameComment) => {
  return isOwnComment(comment) || user.value?.isAdmin === true
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

const getReplyTarget = (comment: GameComment) => {
  if (!comment.reply_to_id) return null

  return comments.value.find(item => item.id === comment.reply_to_id) ?? null
}

const getReplyPreview = (comment: GameComment) => {
  if (comment.message?.trim()) return comment.message.trim()
  if (comment.image_data) return 'Изображение'

  return 'Комментарий'
}

const scrollToComment = (commentId: string | null) => {
  if (!commentId) return

  document.getElementById(`comment-${commentId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  })
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
