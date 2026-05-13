<template>
  <div class="fixed inset-0 z-[100] overflow-y-auto bg-black/55 px-4 py-6 backdrop-blur-sm sm:px-6">
    <div class="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div class="min-w-0">
          <div class="truncate text-xs font-bold uppercase text-red-600">NBA Dashboard News</div>
          <div class="truncate text-sm font-semibold text-gray-500">{{ formatNewsDate(article.created_at) }}</div>
        </div>
        <button
          type="button"
          class="grid h-10 w-10 place-items-center rounded-full border border-gray-200 text-xl leading-none text-gray-600 transition hover:border-gray-900 hover:text-gray-950"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <img
        v-if="article.cover_image_url"
        :src="article.cover_image_url"
        :alt="article.title"
        class="max-h-[420px] w-full object-cover"
      />

      <article class="space-y-6 px-5 py-6 sm:px-8">
        <h1 class="m-0 text-3xl font-black leading-tight text-gray-950 sm:text-4xl">
          {{ article.title }}
        </h1>

        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="gameId in article.game_ids"
            :key="gameId"
            :to="`/game/${gameId}`"
            class="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:no-underline"
          >
            Game {{ gameId }}
          </RouterLink>
          <RouterLink
            v-for="teamAbbr in article.team_abbrs"
            :key="teamAbbr"
            :to="`/team/${teamAbbr}`"
            class="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 hover:no-underline"
          >
            {{ teamAbbr }}
          </RouterLink>
          <button
            v-for="tag in article.hashtags"
            :key="tag"
            type="button"
            class="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-900 hover:text-white"
            @click="$emit('tag', tag)"
          >
            #{{ tag }}
          </button>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black transition"
          :class="liked ? 'border-red-100 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-700'"
          @click="toggleLike"
        >
          ♥ {{ likesCount }}
        </button>
        <RouterLink
          :to="{ name: 'NewsArticle', params: { slug: article.slug || article.id } }"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-700 transition hover:border-gray-900 hover:no-underline"
        >
          Открыть ссылку
        </RouterLink>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-700 transition hover:border-gray-900"
          @click="copyLink"
        >
          {{ copied ? 'Ссылка скопирована' : 'Скопировать ссылку' }}
        </button>

        <div class="news-content" v-html="sanitizedHtml" />

        <ArticleComments :article-id="article.id" />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { authFetch } from '../../api/authFetch'
import type { NewsArticle } from '../../utils/news'
import { formatNewsDate, sanitizeNewsHtml } from '../../utils/news'
import ArticleComments from './ArticleComments.vue'

const props = defineProps<{
  article: NewsArticle
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'tag', tag: string): void
}>()

const sanitizedHtml = computed(() => sanitizeNewsHtml(props.article.content_html))
const articleUrl = computed(() => `${window.location.origin}/news/${props.article.slug || props.article.id}`)
const likesCount = ref(0)
const liked = ref(false)
const copied = ref(false)

const fetchLikes = async () => {
  try {
    const data = await authFetch(`/api/news-articles/${props.article.id}/likes`)
    likesCount.value = data.count ?? 0
    liked.value = Boolean(data.liked)
  } catch {
    likesCount.value = 0
    liked.value = false
  }
}

const toggleLike = async () => {
  try {
    await authFetch(`/api/news-articles/${props.article.id}/likes`, {
      method: liked.value ? 'DELETE' : 'POST'
    })
    liked.value = !liked.value
    likesCount.value += liked.value ? 1 : -1
  } catch {
  }
}

const copyLink = async () => {
  await navigator.clipboard?.writeText(articleUrl.value)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1600)
}

onMounted(() => {
  void fetchLikes()
})
</script>
