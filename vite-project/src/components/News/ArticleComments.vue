<template>
  <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <div class="border-b border-gray-100 px-5 py-4">
      <h2 class="text-base font-black text-gray-950">Комментарии</h2>
      <p class="text-xs font-semibold text-gray-500">Обсуждение статьи хранится постоянно</p>
    </div>

    <div class="max-h-[440px] overflow-y-auto bg-gray-50 p-4">
      <div v-if="!user" class="py-10 text-center text-sm font-semibold text-gray-500">
        Войдите, чтобы читать и отправлять комментарии.
      </div>
      <div v-else-if="loading" class="py-10 text-center text-sm font-semibold text-gray-500">
        Загружаем комментарии...
      </div>
      <div v-else-if="comments.length === 0" class="py-10 text-center text-sm font-semibold text-gray-500">
        Здесь пока нет комментариев.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="comment in comments"
          :key="comment.id"
          :id="`article-comment-${comment.id}`"
          class="flex items-start gap-2.5"
          :class="isOwn(comment) ? 'justify-end' : 'justify-start'"
        >
          <RouterLink v-if="!isOwn(comment)" :to="{ name: 'PublicProfile', params: { id: comment.user_id } }" class="shrink-0">
            <img v-if="comment.profiles?.avatar_img" :src="comment.profiles.avatar_img" alt="User avatar" class="h-8 w-8 rounded-full object-cover" />
            <div v-else class="grid h-8 w-8 place-items-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
              {{ initials(comment) }}
            </div>
          </RouterLink>

          <div class="flex max-w-[min(82%,32rem)] flex-col gap-1" :class="isOwn(comment) ? 'items-end' : 'items-start'">
            <div class="flex items-center gap-2">
              <RouterLink :to="{ name: 'PublicProfile', params: { id: comment.user_id } }" class="truncate text-sm font-bold text-gray-900 hover:text-blue-700">
                {{ authorName(comment) }}
              </RouterLink>
              <span class="text-xs text-gray-500">{{ formatTime(comment.created_at) }}</span>
            </div>

            <div class="w-fit max-w-full rounded-2xl p-4 text-sm" :class="isOwn(comment) ? 'bg-blue-700 text-white' : 'bg-white text-gray-900 shadow-sm'">
              <button
                v-if="replyTarget(comment)"
                type="button"
                class="mb-3 block rounded-lg border-l-4 px-3 py-2 text-left text-xs"
                :class="isOwn(comment) ? 'border-blue-200 bg-blue-600/70 text-blue-50' : 'border-blue-500 bg-gray-50 text-gray-700'"
                @click="scrollTo(comment.reply_to_id)"
              >
                Ответ {{ authorName(replyTarget(comment)!) }}
              </button>
              <p v-if="comment.message" class="whitespace-pre-wrap break-words">{{ comment.message }}</p>
              <img v-if="comment.image_data" :src="comment.image_data" alt="Comment attachment" class="mt-3 max-h-72 rounded-lg border object-contain" />
            </div>

            <div class="flex gap-3 text-xs">
              <button type="button" class="font-bold text-gray-500 hover:text-blue-700" @click="replyTo = comment">Ответить</button>
              <button v-if="canDelete(comment)" type="button" class="font-bold text-gray-500 hover:text-red-700" @click="deleteComment(comment)">Удалить</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-3 border-t border-gray-100 p-4">
      <p v-if="error" class="text-sm font-semibold text-red-600">{{ error }}</p>

      <div v-if="replyTo" class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
        <div class="min-w-0 flex-1 text-sm font-semibold text-blue-900">
          Ответ {{ authorName(replyTo) }}
        </div>
        <button type="button" class="text-xs font-bold text-blue-800" @click="replyTo = null">Сбросить</button>
      </div>

      <div v-if="imageData" class="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
        <img :src="imageData" alt="Selected attachment" class="h-14 w-14 rounded object-cover" />
        <span class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700">{{ imageName }}</span>
        <button type="button" class="text-xs font-bold text-gray-600" @click="removeImage">Убрать</button>
      </div>

      <div class="flex items-end gap-2">
        <label class="grid h-10 w-10 cursor-pointer place-items-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
          <input type="file" accept="image/*" class="hidden" :disabled="!user || sending" @change="attachImage" />
          +
        </label>
        <textarea v-model="message" rows="2" :disabled="!user || sending" class="block flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500" placeholder="Напишите комментарий..." />
        <button type="button" :disabled="!canSend || sending" class="h-10 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-50" @click="sendComment">
          {{ sending ? '...' : 'Отправить' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { authFetch } from '../../api/authFetch'
import { useAuthStore } from '../../stores/auth'

type ArticleComment = {
  id: string
  article_id: string
  user_id: string
  message: string
  image_data: string | null
  reply_to_id: string | null
  created_at: string
  profiles?: {
    first_name: string
    last_name: string
    avatar_img: string | null
  } | null
}

const props = defineProps<{ articleId: string }>()

const auth = useAuthStore()
const comments = ref<ArticleComment[]>([])
const message = ref('')
const imageData = ref<string | null>(null)
const imageName = ref('')
const replyTo = ref<ArticleComment | null>(null)
const loading = ref(false)
const sending = ref(false)
const error = ref('')
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const user = computed(() => auth.user)
const canSend = computed(() => Boolean(user.value && (message.value.trim() || imageData.value)))

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const fetchComments = async () => {
  if (!user.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await authFetch(`/api/news-articles/${props.articleId}/comments`)
    comments.value = data.comments ?? []
  } catch (e: any) {
    error.value = e?.message || 'Не удалось загрузить комментарии'
  } finally {
    loading.value = false
  }
}

const attachImage = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = 'Можно прикрепить только изображение.'
    input.value = ''
    return
  }

  if (file.size > MAX_IMAGE_SIZE) {
    error.value = 'Изображение должно быть меньше 5 МБ.'
    input.value = ''
    return
  }

  error.value = ''
  imageData.value = await fileToDataUrl(file)
  imageName.value = file.name
  input.value = ''
}

const removeImage = () => {
  imageData.value = null
  imageName.value = ''
}

const sendComment = async () => {
  if (!canSend.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    const data = await authFetch(`/api/news-articles/${props.articleId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        message: message.value.trim(),
        imageData: imageData.value,
        replyToId: replyTo.value?.id ?? null
      })
    })
    comments.value = [...comments.value, data.comment]
    message.value = ''
    replyTo.value = null
    removeImage()
  } catch (e: any) {
    error.value = e?.message || 'Не удалось отправить комментарий'
  } finally {
    sending.value = false
  }
}

const deleteComment = async (comment: ArticleComment) => {
  try {
    await authFetch(`/api/news-article-comments/${comment.id}`, { method: 'DELETE' })
    comments.value = comments.value.filter(item => item.id !== comment.id)
  } catch (e: any) {
    error.value = e?.message || 'Не удалось удалить комментарий'
  }
}

const isOwn = (comment: ArticleComment) => comment.user_id === user.value?.id
const canDelete = (comment: ArticleComment) => isOwn(comment) || user.value?.isAdmin === true
const authorName = (comment: ArticleComment) => `${comment.profiles?.first_name ?? ''} ${comment.profiles?.last_name ?? ''}`.trim() || 'Пользователь'
const initials = (comment: ArticleComment) => authorName(comment).charAt(0) || 'U'
const replyTarget = (comment: ArticleComment) => comments.value.find(item => item.id === comment.reply_to_id) ?? null
const scrollTo = (commentId: string | null) => {
  if (!commentId) return
  document.getElementById(`article-comment-${commentId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
const formatTime = (date: string) => new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
}).format(new Date(date))

onMounted(async () => {
  await auth.init()
  await fetchComments()
})
</script>
