<template>
  <section class="space-y-4">
    <h1 class="text-xl font-bold md:text-2xl">{{ title }}</h1>

    <div v-if="loading" class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-semibold text-gray-500">
      Загружаем статьи...
    </div>
    <div v-else-if="error" class="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
      {{ error }}
    </div>
    <div v-else-if="!articles.length" class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm font-semibold text-gray-500">
      Пока нет понравившихся статей.
    </div>

    <div v-else class="space-y-3">
      <article v-for="article in articles" :key="article.id" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <RouterLink :to="{ name: 'NewsArticle', params: { slug: article.slug || article.id } }" class="block w-full text-left hover:no-underline">
          <img v-if="article.cover_image_url" :src="article.cover_image_url" :alt="article.title" class="mb-3 h-36 w-full rounded-lg object-cover" />
          <h2 class="text-base font-black text-gray-950">{{ article.title }}</h2>
          <p class="mt-1 line-clamp-3 text-sm leading-6 text-gray-600">{{ article.excerpt }}</p>
        </RouterLink>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { authFetch } from '../../api/authFetch'
import type { NewsArticle } from '../../utils/news'

const props = withDefaults(defineProps<{
  userId?: string
  title?: string
}>(), {
  userId: '',
  title: 'Понравившиеся статьи'
})

const articles = ref<NewsArticle[]>([])
const loading = ref(false)
const error = ref('')
const endpoint = computed(() => props.userId ? `/api/profiles/${props.userId}/liked-news` : '/api/profile-liked-news')

const fetchArticles = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await authFetch(endpoint.value)
    articles.value = data.articles ?? []
  } catch (e: any) {
    error.value = e?.message || 'Не удалось загрузить понравившиеся статьи'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchArticles()
})

watch(endpoint, () => {
  void fetchArticles()
})
</script>
