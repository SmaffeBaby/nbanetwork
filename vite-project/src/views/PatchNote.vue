<template>
  <div class="min-h-screen bg-gray-50 px-4 pb-16 pt-28 sm:px-8 sm:pt-40">
    <Header />

    <main class="mx-auto max-w-5xl space-y-6 text-left">
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div class="gap-4 sm:flex sm:items-end sm:justify-between">
          <div>
            <h1 class="mt-2 text-3xl font-black text-gray-950 sm:text-5xl">Патч Ноут</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Обновления проекта, изменения интерфейса, новые разделы и важные технические заметки.
            </p>
          </div>

          <button
            v-if="auth.user?.isAdmin"
            type="button"
            class="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-700 sm:mt-0"
            @click="showForm ? closeForm() : openCreateForm()"
          >
            {{ showForm ? 'Закрыть форму' : 'Добавить патч' }}
          </button>
        </div>
      </section>

      <section v-if="showForm && auth.user?.isAdmin" class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="grid gap-4">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-xl font-black text-gray-950">
              {{ editingId ? 'Редактировать патч' : 'Новый патч' }}
            </h2>
            <button
              v-if="editingId"
              type="button"
              class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 transition hover:border-gray-900 hover:text-gray-950"
              @click="openCreateForm"
            >
              Создать новый
            </button>
          </div>

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
              {{ saving ? 'Сохраняем...' : editingId ? 'Сохранить изменения' : 'Опубликовать' }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="patchDates.length" class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-black text-gray-950">Календарь патчей</h2>
            <p class="mt-1 text-sm text-gray-500">Зелёным отмечены дни, когда выходили обновления.</p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Datepicker
              v-model="selectedPatchDate"
              :available-dates="patchDates"
              placeholder="Выберите дату"
            />
            <button
              v-if="selectedPatchDate"
              type="button"
              class="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:border-gray-900 hover:text-gray-950"
              @click="clearSelectedPatchDate"
            >
              Все патчи
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

      <div v-else-if="paginatedPatchNotes.length" class="space-y-4">
        <article v-for="note in paginatedPatchNotes" :key="note.id" class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div class="gap-4 sm:flex sm:items-start sm:justify-between">
            <div>
              <time class="text-xs font-bold uppercase tracking-wide text-gray-500">{{ formatDate(note.created_at) }}</time>
              <h2 class="mt-2 text-2xl font-black text-gray-950">{{ note.title }}</h2>
            </div>

            <div v-if="auth.user?.isAdmin" class="mt-4 flex shrink-0 gap-2 sm:mt-0">
              <button
                type="button"
                class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                @click="startEditPatchNote(note)"
              >
                Редактировать
              </button>
              <button
                type="button"
                class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="deletingId === note.id"
                @click="deletePatchNote(note)"
              >
                {{ deletingId === note.id ? 'Удаляем...' : 'Удалить' }}
              </button>
            </div>
          </div>

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

        <nav v-if="totalPages > 1" class="grid gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:p-4">
          <div class="flex items-center justify-between gap-2 sm:contents">
            <button
              type="button"
              class="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              :disabled="currentPage === 1"
              @click="setPage(currentPage - 1)"
            >
              Назад
            </button>
            <span class="shrink-0 px-2 text-sm font-black text-gray-500 sm:hidden">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              type="button"
              class="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              :disabled="currentPage === totalPages"
              @click="setPage(currentPage + 1)"
            >
              Вперёд
            </button>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2 sm:contents">
            <template v-for="item in paginationItems" :key="item">
              <span
                v-if="typeof item === 'string'"
                class="flex h-10 min-w-8 items-center justify-center text-sm font-black text-gray-400"
              >
                ...
              </span>
              <button
                v-else
                type="button"
                class="h-10 min-w-10 rounded-lg border px-3 text-sm font-black transition"
                :class="item === currentPage ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-gray-900'"
                @click="setPage(item)"
              >
                {{ item }}
              </button>
            </template>
          </div>
        </nav>
      </div>

      <div v-else-if="patchNotes.length" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
        За выбранную дату патчей нет.
      </div>

      <div v-else class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-500">
        Патч ноут пока пуст.
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import Datepicker from '../components/Datepicker/Datepicker.vue'
import Header from '../components/Headers/Header.vue'
import { usePatchNotes } from '../composables/PatchNotes/usePatchNotes'

const {
  auth,
  patchNotes,
  paginatedPatchNotes,
  patchDates,
  loading,
  saving,
  deletingId,
  error,
  formError,
  showForm,
  editingId,
  selectedPatchDate,
  currentPage,
  totalPages,
  paginationItems,
  form,
  addLink,
  removeLink,
  openCreateForm,
  closeForm,
  startEditPatchNote,
  savePatchNote,
  deletePatchNote,
  clearSelectedPatchDate,
  setPage,
  formatDate
} = usePatchNotes()
</script>
