<template>
  <div class="min-h-screen px-4 pt-28 sm:px-8 sm:pt-36">
    <Header />

    <main class="mx-auto max-w-4xl pb-16">
      <RouterLink to="/news" class="mb-4 inline-flex rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900">
        Назад к новостям
      </RouterLink>

      <div v-if="loading" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
        Загружаем статью...
      </div>
      <div v-else-if="error" class="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm font-bold text-red-700">
        {{ error }}
      </div>

      <article v-else-if="article" class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <img v-if="article.cover_image_url" :src="article.cover_image_url" :alt="article.title" class="max-h-[460px] w-full object-cover" />

        <div class="space-y-6 px-5 py-6 sm:px-8">
          <div class="space-y-3">
            <p class="text-xs font-black uppercase text-red-600">NBA Dashboard News</p>
            <h1 class="m-0 text-3xl font-black leading-tight text-gray-950 sm:text-5xl">{{ article.title }}</h1>
            <p class="text-sm font-semibold text-gray-500">{{ formatNewsDate(article.created_at) }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <RouterLink v-for="gameId in article.game_ids" :key="gameId" :to="`/game/${gameId}`" class="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              Game {{ gameId }}
            </RouterLink>
            <RouterLink v-for="teamAbbr in article.team_abbrs" :key="teamAbbr" :to="`/team/${teamAbbr}`" class="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
              {{ teamAbbr }}
            </RouterLink>
            <RouterLink v-for="tag in article.hashtags" :key="tag" :to="{ name: 'News', query: { tag } }" class="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
              #{{ tag }}
            </RouterLink>
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="rounded-xl border px-4 py-2 text-sm font-black transition" :class="liked ? 'border-red-100 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-700'" @click="toggleLike">
              ♥ {{ likesCount }}
            </button>
            <button type="button" class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 transition hover:border-gray-900" @click="copyLink">
              {{ copied ? 'Ссылка скопирована' : 'Скопировать ссылку' }}
            </button>
          </div>

          <div class="news-content" v-html="sanitizedHtml" />

          <ArticleComments :article-id="article.id" />
        </div>
      </article>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Header from '../components/Headers/Header.vue'
import ArticleComments from '../components/News/ArticleComments.vue'
import { useNewsArticle } from '../composables/News/useNewsArticle'
import { formatNewsDate } from '../utils/news'

const {
  article,
  loading,
  error,
  likesCount,
  liked,
  copied,
  sanitizedHtml,
  toggleLike,
  copyLink
} = useNewsArticle()
</script>
