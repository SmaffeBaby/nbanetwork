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
            <select class="rounded-lg border border-gray-200 px-2 py-2 text-sm font-semibold" @change="runCommand('formatBlock', ($event.target as HTMLSelectElement).value)">
              <option value="p">Абзац</option>
              <option value="h2">Заголовок H2</option>
              <option value="h3">Заголовок H3</option>
              <option value="blockquote">Цитата</option>
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
            <button type="button" class="tool-btn" @click="addLink">Link</button>
            <button type="button" class="tool-btn" @click="addImageByUrl">Image URL</button>
            <label class="tool-btn cursor-pointer">
              Upload
              <input type="file" accept="image/*" class="hidden" @change="addImageFile" />
            </label>
          </div>

          <div
            ref="editor"
            class="news-editor news-content min-h-[360px] bg-white p-4 outline-none"
            contenteditable="true"
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
          <span class="text-sm font-bold text-gray-700">ID игр</span>
          <textarea v-model="gameIdsInput" class="field min-h-24" placeholder="0042500224, 0022500001" />
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
import { nextTick, onMounted, ref, watch } from 'vue'
import { authFetch } from '../../api/authFetch'
import { makeExcerpt, makeSlug, normalizeGameId, normalizeHashtag, sanitizeNewsHtml, type NewsArticle } from '../../utils/news'

const props = defineProps<{
  article: NewsArticle | null
  authorId: string
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

const editor = ref<HTMLElement | null>(null)
const title = ref('')
const contentHtml = ref('')
const coverImageUrl = ref('')
const gameIdsInput = ref('')
const hashtagsInput = ref('')
const published = ref(true)
const saving = ref(false)
const error = ref('')

const resetForm = async () => {
  title.value = props.article?.title ?? ''
  contentHtml.value = props.article?.content_html ?? '<p></p>'
  coverImageUrl.value = props.article?.cover_image_url ?? ''
  gameIdsInput.value = props.article?.game_ids?.join(', ') ?? ''
  hashtagsInput.value = props.article?.hashtags?.map(tag => `#${tag}`).join(', ') ?? ''
  published.value = props.article?.published ?? true
  error.value = ''

  await nextTick()
  if (editor.value) editor.value.innerHTML = contentHtml.value
}

const syncContent = () => {
  contentHtml.value = editor.value?.innerHTML ?? ''
}

const runCommand = (command: string, value?: string) => {
  editor.value?.focus()
  document.execCommand(command, false, value)
  syncContent()
}

const addLink = () => {
  const url = window.prompt('URL ссылки')
  if (!url) return
  runCommand('createLink', url)
}

const addImageByUrl = () => {
  const url = window.prompt('URL изображения')
  if (!url) return
  runCommand('insertImage', url)
}

const addImageFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      runCommand('insertImage', reader.result)
    }
  }
  reader.readAsDataURL(file)
}

const save = async () => {
  if (saving.value) return

  syncContent()
  const cleanHtml = sanitizeNewsHtml(contentHtml.value)
  const gameIds = Array.from(new Set(gameIdsInput.value.split(/[\s,;]+/).map(normalizeGameId).filter(Boolean)))
  const hashtags = Array.from(new Set(hashtagsInput.value.split(/[\s,;]+/).map(normalizeHashtag).filter(Boolean)))

  if (!title.value.trim() || !makeExcerpt(cleanHtml, 1000)) {
    error.value = 'Нужны заголовок и текст новости.'
    return
  }

  saving.value = true
  error.value = ''

  const payload = {
    author_id: props.article?.author_id ?? props.authorId,
    title: title.value.trim(),
    slug: props.article?.slug ?? makeSlug(title.value),
    excerpt: makeExcerpt(cleanHtml),
    content_html: cleanHtml,
    cover_image_url: coverImageUrl.value.trim() || null,
    game_ids: gameIds,
    hashtags,
    published: published.value
  }

  try {
    await authFetch(
      props.article ? `/api/news-articles/${props.article.id}` : '/api/news-articles',
      {
        method: props.article ? 'PATCH' : 'POST',
        body: JSON.stringify(payload)
      }
    )

    emit('saved')
  } catch (saveError: any) {
    error.value = saveError?.message || 'Не удалось сохранить новость.'
  } finally {
    saving.value = false
  }
}

watch(() => props.article, () => {
  void resetForm()
})

onMounted(() => {
  void resetForm()
})
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
