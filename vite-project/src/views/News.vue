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
          @open="openArticle"
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

  </div>
</template>

<script setup lang="ts">
import Header from '../components/Headers/Header.vue'
import NewsArticleCard from '../components/News/NewsArticleCard.vue'
import NewsEditor from '../components/News/NewsEditor.vue'
import { useNewsList } from '../composables/News/useNewsList'

const {
  auth,
  articles,
  editingArticle,
  showEditor,
  loading,
  error,
  page,
  totalPages,
  search,
  activeTag,
  applySearch,
  setTag,
  clearTag,
  startCreate,
  startEdit,
  openArticle,
  closeEditor,
  handleSaved,
  deleteArticle
} = useNewsList()
</script>
