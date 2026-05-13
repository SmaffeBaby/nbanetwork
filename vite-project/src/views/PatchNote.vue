<template>
  <div class="min-h-screen bg-gray-50 px-4 pb-16 pt-28 sm:px-8 sm:pt-40">
    <Header />

    <main class="mx-auto max-w-5xl space-y-6 text-left">
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div class="gap-4 sm:flex sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-bold uppercase tracking-wide text-blue-700">NBA MOM</p>
            <h1 class="mt-2 text-3xl font-black text-gray-950 sm:text-5xl">Патч Ноут</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Обновления проекта, изменения интерфейса, новые разделы и важные технические заметки.
            </p>
          </div>

          <button
            v-if="auth.user?.isAdmin"
            type="button"
            class="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-700 sm:mt-0"
            @click="showForm = !showForm"
          >
            {{ showForm ? 'Закрыть форму' : 'Добавить патч' }}
          </button>
        </div>
      </section>

      <section v-if="showForm && auth.user?.isAdmin" class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="grid gap-4">
          <input
            v-model="form.title"
            type="text"
            class="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            placeholder="Заголовок"
          />
          <textarea
            v-model="form.body"
            rows="7"
            class="rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            placeholder="Текст обновления"
          ></textarea>

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-base font-black text-gray-950">Ссылки</h2>
              <button type="button" class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:border-gray-900" @click="addLink">
                Добавить ссылку
              </button>
            </div>

            <div v-if="form.links.length" class="space-y-2">
              <div v-for="(link, index) in form.links" :key="index" class="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                <input
                  v-model="link.label"
                  type="text"
                  class="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Название ссылки"
                />
                <input
                  v-model="link.url"
                  type="url"
                  class="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="https://..."
                />
                <button type="button" class="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 hover:border-red-300 hover:text-red-600" @click="removeLink(index)">
                  Убрать
                </button>
              </div>
            </div>
          </div>

          <div v-if="formError" class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {{ formError }}
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="saving"
              @click="savePatchNote"
            >
              {{ saving ? 'Сохраняем...' : 'Опубликовать' }}
            </button>
          </div>
        </div>
      </section>

      <div v-if="loading" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
        Загружаем патчи...
      </div>

      <div v-else-if="error" class="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm font-bold text-red-700">
        {{ error }}
      </div>

      <div v-else-if="patchNotes.length" class="space-y-4">
        <article v-for="note in patchNotes" :key="note.id" class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <time class="text-xs font-bold uppercase tracking-wide text-gray-500">{{ formatDate(note.created_at) }}</time>
          <h2 class="mt-2 text-2xl font-black text-gray-950">{{ note.title }}</h2>
          <p class="mt-4 whitespace-pre-wrap text-base leading-7 text-gray-700">{{ note.body }}</p>

          <div v-if="note.links.length" class="mt-5 flex flex-wrap gap-2">
            <a
              v-for="link in note.links"
              :key="`${note.id}-${link.url}`"
              :href="link.url"
              target="_blank"
              rel="noreferrer"
              class="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 hover:border-blue-300"
            >
              {{ link.label || link.url }}
            </a>
          </div>
        </article>
      </div>

      <div v-else class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
        Патч ноут пока пуст.
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import Header from '../components/Headers/Header.vue'
import { usePatchNotes } from '../composables/PatchNotes/usePatchNotes'

const {
  auth,
  patchNotes,
  loading,
  saving,
  error,
  formError,
  showForm,
  form,
  addLink,
  removeLink,
  savePatchNote,
  formatDate
} = usePatchNotes()
</script>
