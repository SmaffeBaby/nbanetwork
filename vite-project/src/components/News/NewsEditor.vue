<template>
  <form class="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6" @submit.prevent="save">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-black text-gray-950">{{ article ? 'Редактировать новость' : 'Добавить новость' }}</h2>
        <p class="text-sm font-semibold text-gray-500">Статья появится в ленте и на страницах выбранных игр.</p>
      </div>
      <button type="button" class="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700" @click="$emit('cancel')">
        Закрыть
      </button>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div class="space-y-4">
        <input
          v-model="title"
          type="text"
          required
          class="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          placeholder="Заголовок новости"
        />

        <div class="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          <div class="flex flex-wrap gap-2 border-b border-gray-200 bg-white p-2">
            <select class="rounded-lg border border-gray-200 px-2 py-2 text-sm font-semibold" @change="handleBlockFormat">
              <option value="p">Абзац</option>
              <option value="h2">Заголовок H2</option>
              <option value="h3">Заголовок H3</option>
              <option value="blockquote">Цитата</option>
              <option value="sources">Источники</option>
            </select>
            <select class="rounded-lg border border-gray-200 px-2 py-2 text-sm font-semibold" @change="runCommand('fontName', ($event.target as HTMLSelectElement).value)">
              <option value="Inter">Inter</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </select>
            <button type="button" class="tool-btn" @click="runCommand('bold')">B</button>
            <button type="button" class="tool-btn italic" @click="runCommand('italic')">I</button>
            <button type="button" class="tool-btn underline" @click="runCommand('underline')">U</button>
            <button type="button" class="tool-btn" @click="runCommand('insertUnorderedList')">•</button>
            <button type="button" class="tool-btn" @click="runCommand('insertOrderedList')">1.</button>
            <button type="button" class="tool-btn" @click="runCommand('justifyLeft')">Left</button>
            <button type="button" class="tool-btn" @click="runCommand('justifyCenter')">Center</button>
            <button type="button" class="tool-btn" @click="runCommand('justifyRight')">Right</button>
            <label class="tool-btn cursor-pointer">
              Color
              <input type="color" class="ml-2 h-5 w-6 align-middle" @input="runCommand('foreColor', ($event.target as HTMLInputElement).value)" />
            </label>
            <button type="button" class="tool-btn" @click="addLink">Link</button>
            <button type="button" class="tool-btn" @click="runCommand('unlink')">Unlink</button>
            <button type="button" class="tool-btn" @click="addImageByUrl">Image URL</button>
            <label class="tool-btn cursor-pointer">
              Upload
              <input type="file" accept="image/*" class="hidden" @change="addImageFile" />
            </label>
            <button type="button" class="tool-btn" :disabled="!selectedImage" @click="moveSelectedImage('up')">Img ↑</button>
            <button type="button" class="tool-btn" :disabled="!selectedImage" @click="moveSelectedImage('down')">Img ↓</button>
            <button type="button" class="tool-btn" :disabled="!selectedImage" @click="removeSelectedImage">Img ×</button>
          </div>

          <div
            ref="editor"
            class="news-editor news-content min-h-[360px] bg-white p-4 outline-none"
            contenteditable="true"
            @click="selectEditorImage"
            @input="syncContent"
          />
        </div>
      </div>

      <aside class="space-y-4">
        <label class="block space-y-2">
          <span class="text-sm font-bold text-gray-700">Обложка URL</span>
          <input v-model="coverImageUrl" type="url" class="field" placeholder="https://..." />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-bold text-gray-700">Обложка файлом</span>
          <input type="file" accept="image/*" class="field bg-white text-sm" @change="addCoverFile" />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-bold text-gray-700">ID игр</span>
          <textarea v-model="gameIdsInput" class="field min-h-24" placeholder="0042500224, 0022500001" />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-bold text-gray-700">Команды</span>
          <textarea v-model="teamAbbrsInput" class="field min-h-20" placeholder="DET, OKC, BOS" />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-bold text-gray-700">Хештеги</span>
          <textarea v-model="hashtagsInput" class="field min-h-24" placeholder="#playoffs, #okc, #finals" />
        </label>

        <label class="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm font-bold text-gray-700">
          <input v-model="published" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
          Опубликовано
        </label>

        <div v-if="error" class="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="saving"
          class="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ saving ? 'Сохраняем...' : 'Сохранить новость' }}
        </button>
      </aside>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { NewsArticle } from '../../utils/news'
import { useNewsEditor } from '../../composables/News/useNewsEditor'

const props = defineProps<{
  article: NewsArticle | null
  authorId: string
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

const {
  editor,
  title,
  coverImageUrl,
  gameIdsInput,
  teamAbbrsInput,
  hashtagsInput,
  published,
  saving,
  error,
  selectedImage,
  syncContent,
  runCommand,
  handleBlockFormat,
  addLink,
  addImageByUrl,
  addImageFile,
  addCoverFile,
  selectEditorImage,
  moveSelectedImage,
  removeSelectedImage,
  save
} = useNewsEditor(props, emit)
</script>

<style scoped>
.tool-btn {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 0.5rem 0.65rem;
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
}

.tool-btn:hover {
  border-color: #111827;
  color: #111827;
}

.field {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  outline: none;
  padding: 0.75rem 0.9rem;
}

.field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}
</style>
