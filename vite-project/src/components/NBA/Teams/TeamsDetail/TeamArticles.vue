<template>
  <section class="space-y-4">
    <div v-if="loading" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
      Загружаем статьи...
    </div>
    <div v-else-if="!articles.length" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
      Для этой команды пока нет статей.
    </div>
    <div v-else class="grid gap-4 md:grid-cols-2">
      <article v-for="article in articles" :key="article.id" class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <RouterLink :to="{ name: 'NewsArticle', params: { slug: article.slug || article.id } }" class="block w-full text-left hover:no-underline">
          <img v-if="article.cover_image_url" :src="article.cover_image_url" :alt="article.title" class="h-44 w-full object-cover" />
          <div class="space-y-2 p-5">
            <h2 class="text-lg font-black leading-tight text-gray-950">{{ article.title }}</h2>
            <p class="line-clamp-3 text-sm leading-6 text-gray-600">{{ article.excerpt }}</p>
          </div>
        </RouterLink>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '../../../../lib/supabase'
import type { NewsArticle } from '../../../../utils/news'

const props = defineProps<{ teamAbbr: string }>()

const articles = ref<NewsArticle[]>([])
const loading = ref(false)

const fetchArticles = async () => {
  if (!props.teamAbbr) return
  loading.value = true

  const { data } = await supabase
    .from('news_articles')
    .select('*, profiles!news_articles_author_id_fkey(first_name, last_name, avatar_img)')
    .contains('team_abbrs', [props.teamAbbr.toUpperCase()])
    .order('created_at', { ascending: false })

  articles.value = (data ?? []) as NewsArticle[]
  loading.value = false
}

watch(() => props.teamAbbr, () => {
  void fetchArticles()
})

onMounted(() => {
  void fetchArticles()
})
</script>
