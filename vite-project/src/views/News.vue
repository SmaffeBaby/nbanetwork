<template>
  <div class="min-h-screen px-4 pt-28 sm:px-8 sm:pt-36">
    <Header />

    <main class="mx-auto max-w-7xl space-y-6 pb-16">
      <section class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="m-0 text-3xl font-black text-gray-950 sm:text-5xl">Новости</h1>
            <p class="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500">
              Статьи NBA Dashboard, привязанные к матчам, темам и хештегам.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <input
              v-model="search"
              type="search"
              class="h-11 min-w-0 rounded-xl border border-gray-200 px-4 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-72"
              placeholder="Поиск по новостям и тегам"
              @keydown.enter="applySearch"
            />
            <button type="button" class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900" @click="applySearch">
              Найти
            </button>
            <button
              v-if="auth.user?.isAdmin"
              type="button"
              class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-700"
              @click="startCreate"
            >
              Добавить новость
            </button>
          </div>
        </div>

        <div v-if="activeTag" class="mt-4 flex items-center gap-2">
          <span class="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-700">#{{ activeTag }}</span>
          <button type="button" class="text-sm font-bold text-blue-700" @click="clearTag">Сбросить</button>
        </div>
      </section>

      <NewsEditor
        v-if="showEditor && auth.user?.isAdmin"
        :article="editingArticle"
        :author-id="auth.user.id"
        @saved="handleSaved"
        @cancel="closeEditor"
      />

      <div v-if="loading" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
        Загружаем новости...
      </div>

      <div v-else-if="error" class="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm font-bold text-red-700">
        {{ error }}
      </div>

      <div v-else-if="articles.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <NewsArticleCard
          v-for="article in articles"
          :key="article.id"
          :article="article"
          :can-edit="Boolean(auth.user?.isAdmin)"
          @open="selectedArticle = $event"
          @edit="startEdit"
          @delete="deleteArticle"
          @tag="setTag"
        />
      </div>

      <div v-else class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
        Новостей пока нет.
      </div>

      <div v-if="totalPages > 1" class="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40"
          :disabled="page === 1"
          @click="page -= 1"
        >
          Назад
        </button>
        <button
          v-for="pageNumber in totalPages"
          :key="pageNumber"
          type="button"
          class="h-10 w-10 rounded-xl text-sm font-black transition"
          :class="pageNumber === page ? 'bg-gray-950 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-900'"
          @click="page = pageNumber"
        >
          {{ pageNumber }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40"
          :disabled="page === totalPages"
          @click="page += 1"
        >
          Вперёд
        </button>
      </div>
    </main>

    <NewsArticleModal
      v-if="selectedArticle"
      :article="selectedArticle"
      @close="selectedArticle = null"
      @tag="setTag"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Header from '../components/Headers/Header.vue'
import NewsArticleCard from '../components/News/NewsArticleCard.vue'
import NewsArticleModal from '../components/News/NewsArticleModal.vue'
import NewsEditor from '../components/News/NewsEditor.vue'
import { authFetch } from '../api/authFetch'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type { NewsArticle } from '../utils/news'

const pageSize = 6
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const articles = ref<NewsArticle[]>([])
const selectedArticle = ref<NewsArticle | null>(null)
const editingArticle = ref<NewsArticle | null>(null)
const showEditor = ref(false)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const total = ref(0)
const search = ref(String(route.query.q ?? ''))
const activeTag = ref(String(route.query.tag ?? ''))

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const fetchArticles = async () => {
  loading.value = true
  error.value = ''

  const from = (page.value - 1) * pageSize
  const to = from + pageSize - 1
  let query = supabase
    .from('news_articles')
    .select('*, profiles(first_name, last_name, avatar_img)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (activeTag.value) {
    query = query.contains('hashtags', [activeTag.value])
  }

  const searchTerm = search.value.trim()
  if (searchTerm) {
    const escaped = searchTerm.replace(/[%_,]/g, '')
    query = query.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`)
  }

  const { data, error: fetchError, count } = await query

  loading.value = false

  if (fetchError) {
    error.value = fetchError.message
    articles.value = []
    total.value = 0
    return
  }

  articles.value = (data ?? []) as NewsArticle[]
  total.value = count ?? 0
}

const applySearch = () => {
  page.value = 1
  void router.replace({ path: '/news', query: { ...route.query, q: search.value.trim() || undefined } })
  void fetchArticles()
}

const setTag = (tag: string) => {
  selectedArticle.value = null
  activeTag.value = tag
  page.value = 1
  void router.replace({ path: '/news', query: { tag } })
  void fetchArticles()
}

const clearTag = () => {
  activeTag.value = ''
  void router.replace({ path: '/news', query: search.value.trim() ? { q: search.value.trim() } : {} })
  void fetchArticles()
}

const startCreate = () => {
  editingArticle.value = null
  showEditor.value = true
}

const startEdit = (article: NewsArticle) => {
  editingArticle.value = article
  showEditor.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const closeEditor = () => {
  showEditor.value = false
  editingArticle.value = null
}

const handleSaved = () => {
  closeEditor()
  void fetchArticles()
}

const deleteArticle = async (article: NewsArticle) => {
  if (!window.confirm(`Удалить новость "${article.title}"?`)) return

  try {
    await authFetch(`/api/news-articles/${article.id}`, { method: 'DELETE' })
  } catch (deleteError: any) {
    error.value = deleteError?.message || 'Не удалось удалить новость.'
    return
  }

  void fetchArticles()
}

watch(page, () => {
  void fetchArticles()
})

onMounted(async () => {
  await auth.init()
  void fetchArticles()
})
</script>
