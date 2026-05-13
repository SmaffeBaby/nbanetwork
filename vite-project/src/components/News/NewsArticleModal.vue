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

        <div class="news-content" v-html="sanitizedHtml" />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { NewsArticle } from '../../utils/news'
import { formatNewsDate, sanitizeNewsHtml } from '../../utils/news'

const props = defineProps<{
  article: NewsArticle
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'tag', tag: string): void
}>()

const sanitizedHtml = computed(() => sanitizeNewsHtml(props.article.content_html))
</script>
