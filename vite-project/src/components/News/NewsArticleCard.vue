<template>
  <article class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <button type="button" class="block w-full text-left" @click="$emit('open', article)">
      <img
        v-if="article.cover_image_url"
        :src="article.cover_image_url"
        :alt="article.title"
        class="h-48 w-full object-cover"
      />

      <div class="space-y-4 p-5">
        <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
          <span>{{ formatNewsDate(article.created_at) }}</span>
          <span v-if="authorName">• {{ authorName }}</span>
          <span v-if="article.game_ids.length" class="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
            {{ article.game_ids.length }} game
          </span>
        </div>

        <div class="space-y-2">
          <h2 class="text-xl font-black leading-tight text-gray-950">
            {{ article.title }}
          </h2>
          <p class="line-clamp-3 text-sm leading-6 text-gray-600">
            {{ article.excerpt }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in article.hashtags"
            :key="tag"
            type="button"
            class="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 transition hover:bg-gray-900 hover:text-white"
            @click.stop="$emit('tag', tag)"
          >
            #{{ tag }}
          </button>
        </div>
      </div>
    </button>

    <div v-if="canEdit" class="flex gap-2 border-t border-gray-100 p-4">
      <button
        type="button"
        class="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-900 hover:text-gray-950"
        @click="$emit('edit', article)"
      >
        Редактировать
      </button>
      <button
        type="button"
        class="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
        @click="$emit('delete', article)"
      >
        Удалить
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NewsArticle } from '../../utils/news'
import { formatNewsDate } from '../../utils/news'

const props = defineProps<{
  article: NewsArticle
  canEdit: boolean
}>()

defineEmits<{
  (e: 'open', article: NewsArticle): void
  (e: 'edit', article: NewsArticle): void
  (e: 'delete', article: NewsArticle): void
  (e: 'tag', tag: string): void
}>()

const authorName = computed(() => {
  const profile = props.article.profiles
  return `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
})
</script>
