<template>
  <section v-if="articles.length" class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="text-xs font-black uppercase text-red-600">NBA Dashboard News</div>
        <h2 class="text-xl font-black text-gray-950">Материалы к игре</h2>
      </div>
      <RouterLink to="/news" class="text-sm font-bold text-blue-700 hover:text-blue-900">
        Все новости
      </RouterLink>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <article
        v-for="article in articles"
        :key="article.id"
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        <button type="button" class="block w-full text-left" @click="selectedArticle = article">
          <img
            v-if="article.cover_image_url"
            :src="article.cover_image_url"
            :alt="article.title"
            class="h-40 w-full object-cover"
          />
          <div class="space-y-3 p-5">
            <div class="text-xs font-bold text-gray-500">{{ formatNewsDate(article.created_at) }}</div>
            <h3 class="text-lg font-black leading-tight text-gray-950">{{ article.title }}</h3>
            <p class="line-clamp-3 text-sm leading-6 text-gray-600">{{ article.excerpt }}</p>
            <div class="flex flex-wrap gap-2">
              <RouterLink
                v-for="tag in article.hashtags"
                :key="tag"
                :to="{ path: '/news', query: { tag } }"
                class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-900 hover:text-white hover:no-underline"
                @click.stop
              >
                #{{ tag }}
              </RouterLink>
            </div>
          </div>
        </button>
      </article>
    </div>

    <NewsArticleModal
      v-if="selectedArticle"
      :article="selectedArticle"
      @close="selectedArticle = null"
      @tag="openTag"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import NewsArticleModal from '../../News/NewsArticleModal.vue'
import { supabase } from '../../../lib/supabase'
import { formatNewsDate, type NewsArticle } from '../../../utils/news'

const props = defineProps<{
  gameId: string
}>()

const router = useRouter()
const articles = ref<NewsArticle[]>([])
const selectedArticle = ref<NewsArticle | null>(null)

const fetchArticles = async () => {
  if (!props.gameId) return

  const { data } = await supabase
    .from('news_articles')
    .select('*, profiles(first_name, last_name, avatar_img)')
    .contains('game_ids', [props.gameId])
    .order('created_at', { ascending: false })
    .limit(4)

  articles.value = (data ?? []) as NewsArticle[]
}

const openTag = (tag: string) => {
  selectedArticle.value = null
  void router.push({ path: '/news', query: { tag } })
}

watch(() => props.gameId, () => {
  void fetchArticles()
})

onMounted(() => {
  void fetchArticles()
})
</script>
