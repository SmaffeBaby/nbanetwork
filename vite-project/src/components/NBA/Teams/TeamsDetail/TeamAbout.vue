<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div>
        <h2 class="text-xl font-black text-gray-950">О команде</h2>
      </div>

      <div v-if="auth.user?.isAdmin" class="flex flex-wrap gap-2">
        <button
          v-if="!isEditing"
          type="button"
          class="rounded-lg bg-gray-950 px-4 py-2 text-sm font-black text-white transition hover:bg-gray-800"
          @click="startEditing"
        >
          Редактировать
        </button>
        <template v-else>
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-black text-gray-700 transition hover:border-gray-950"
            @click="cancelEditing"
          >
            Отмена
          </button>
          <button
            type="button"
            :disabled="saving"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
            @click="saveAbout"
          >
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
        </template>
      </div>
    </div>

    <div v-if="loading" class="rounded-xl bg-white p-8 text-center text-sm font-bold text-gray-500 shadow-sm">
      Загружаем описание команды...
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
      {{ error }}
    </div>

    <div v-else-if="isEditing" class="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="h-fit rounded-xl bg-white p-3 shadow-sm">
        <div class="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <button type="button" class="editor-tool" @click="addBlock('paragraph')">Абзац</button>
          <button type="button" class="editor-tool" @click="addBlock('heading')">Заголовок</button>
          <button type="button" class="editor-tool" @click="addBlock('gallery')">Галерея</button>
          <button type="button" class="editor-tool" @click="addBlock('hallOfFame')">Зал славы</button>
        </div>
      </aside>

      <div class="space-y-3">
        <article
          v-for="(block, index) in draftBlocks"
          :key="block.id"
          class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4"
          draggable="true"
          @dragstart="draggedIndex = index"
          @dragover.prevent
          @drop="dropBlock(index)"
        >
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-xs font-black uppercase text-gray-400">
              <span class="cursor-grab rounded-md bg-gray-100 px-2 py-1">Drag</span>
              <span>{{ blockLabel(block.type) }}</span>
            </div>

            <div class="flex gap-1">
              <button type="button" class="icon-btn" :disabled="index === 0" @click="moveBlock(index, index - 1)">↑</button>
              <button type="button" class="icon-btn" :disabled="index === draftBlocks.length - 1" @click="moveBlock(index, index + 1)">↓</button>
              <button type="button" class="icon-btn text-red-600" @click="removeBlock(block.id)">×</button>
            </div>
          </div>

          <div v-if="block.type === 'paragraph'" class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <button type="button" class="mini-tool" @click="formatParagraph(block.id, 'bold')">B</button>
              <button type="button" class="mini-tool italic" @click="formatParagraph(block.id, 'italic')">I</button>
              <button type="button" class="mini-tool underline" @click="formatParagraph(block.id, 'underline')">U</button>
              <button type="button" class="mini-tool" @click="addParagraphLink(block.id)">Link</button>
              <button type="button" class="mini-tool" @click="formatParagraph(block.id, 'unlink')">Unlink</button>
            </div>
            <div
              :ref="el => setParagraphEditor(block.id, el)"
              class="team-about-editor min-h-28 rounded-lg border border-gray-200 p-3 text-sm leading-7 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              contenteditable="true"
              @input="syncParagraph(block)"
              @focus="activeParagraphId = block.id"
              v-html="block.html"
            />
          </div>

          <div v-else-if="block.type === 'heading'" class="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <input v-model="block.text" class="field" placeholder="Текст заголовка" />
            <select v-model.number="block.level" class="field sm:w-24">
              <option :value="2">H2</option>
              <option :value="3">H3</option>
            </select>
            <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600">
              <input v-model="block.collapsible" type="checkbox" />
              Скрываемый
            </label>
            <label v-if="block.collapsible" class="flex items-center gap-2 text-sm font-bold text-gray-600 sm:col-span-3">
              <input v-model="block.collapsedByDefault" type="checkbox" />
              Свернуть по умолчанию
            </label>
          </div>

          <div v-else-if="block.type === 'gallery'" class="space-y-3">
            <input v-model="block.title" class="field" placeholder="Название галереи" />
            <div class="space-y-2">
              <div
                v-for="image in block.images"
                :key="image.id"
                class="grid gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input v-model="image.url" class="field bg-white" placeholder="URL изображения" />
                <input v-model="image.alt" class="field bg-white" placeholder="Описание" />
                <button type="button" class="icon-btn text-red-600" @click="removeGalleryImage(block, image.id)">×</button>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="editor-tool w-full sm:w-auto" @click="addGalleryImage(block)">Добавить URL</button>
              <label class="editor-tool w-full cursor-pointer text-center sm:w-auto">
                Загрузить фото
                <input type="file" accept="image/*" multiple class="hidden" @change="uploadGalleryImage(block, $event)" />
              </label>
            </div>
          </div>

          <div v-else class="space-y-3">
            <div class="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <input v-model="block.title" class="field" placeholder="Название блока" />
              <label class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600">
                <input v-model="block.hidden" type="checkbox" />
                Скрыть блок
              </label>
            </div>

            <div class="space-y-3">
              <div
                v-for="(item, itemIndex) in block.items"
                :key="item.id"
                class="grid gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 lg:grid-cols-[120px_minmax(0,1fr)_auto]"
              >
                <div class="flex items-center justify-center rounded-lg bg-white p-3">
                  <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.label || item.mvpPlayerName || 'Hall of fame item'" class="h-20 w-20 object-contain" loading="lazy" decoding="async" />
                  <span v-else class="text-center text-xs font-black uppercase text-gray-300">SVG / PNG</span>
                </div>

                <div class="grid gap-2 sm:grid-cols-2">
                  <label class="space-y-1 sm:col-span-2">
                    <span class="label">Загрузить SVG или PNG</span>
                    <input type="file" accept=".svg,.png,image/svg+xml,image/png" class="field bg-white text-sm" @change="uploadHallOfFameImage(item, $event)" />
                  </label>
                  <input v-model="item.imageUrl" class="field bg-white sm:col-span-2" placeholder="или URL / data URL изображения" />
                  <input v-model="item.label" class="field bg-white sm:col-span-2" placeholder="Подпись к изображению (необязательно)" />
                  <input v-model="item.mvpPlayerName" class="field bg-white" placeholder="MVP игрок (необязательно)" />
                  <input v-model="item.mvpSeason" class="field bg-white" placeholder="Сезон MVP" />
                  <label class="space-y-1">
                    <span class="label">Тип ссылки</span>
                    <select v-model="item.linkType" class="field bg-white">
                      <option value="internal">Внутренняя</option>
                      <option value="external">Внешняя</option>
                    </select>
                  </label>
                  <label class="space-y-1">
                    <span class="label">Ссылка на игрока</span>
                    <input
                      v-model="item.playerUrl"
                      class="field bg-white"
                      :placeholder="item.linkType === 'internal' ? '/brunson' : 'https://...'"
                    />
                  </label>
                  <label class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600">
                    <input v-model="item.breakAfter" type="checkbox" />
                    Перенос после этой SVG
                  </label>
                  <label class="grid gap-1">
                    <span class="label">Отступ после, px</span>
                    <input v-model.number="item.spacingAfter" type="number" min="0" max="160" step="4" class="field bg-white" />
                  </label>
                </div>

                <div class="flex gap-1 lg:flex-col">
                  <button type="button" class="icon-btn" :disabled="itemIndex === 0" @click="moveHallOfFameItem(block, itemIndex, itemIndex - 1)">↑</button>
                  <button type="button" class="icon-btn" :disabled="itemIndex === block.items.length - 1" @click="moveHallOfFameItem(block, itemIndex, itemIndex + 1)">↓</button>
                  <button type="button" class="icon-btn text-red-600" @click="removeHallOfFameItem(block, item.id)">×</button>
                </div>
              </div>

              <button type="button" class="editor-tool w-full sm:w-auto" @click="addHallOfFameItem(block)">
                + Добавить SVG
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div v-else-if="!hasContent && auth.user?.isAdmin" class="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm font-bold text-gray-500">
      Описание пока пустое. Нажмите “Редактировать”, чтобы собрать страницу.
    </div>

    <div v-else class="space-y-4">
      <template v-for="block in visibleBlocks" :key="block.id">
        <div
          v-if="block.type === 'heading'"
          class="group flex w-full items-center justify-between gap-3 text-left"
          :class="block.collapsible ? 'cursor-pointer' : ''"
          role="button"
          :tabindex="block.collapsible ? 0 : -1"
          @click="toggleHeading(block)"
          @keydown.enter="toggleHeading(block)"
        >
          <component
            :is="block.level === 3 ? 'h3' : 'h2'"
            class="font-black text-gray-950"
            :class="block.level === 3 ? 'text-xl' : 'text-2xl'"
          >
            {{ block.text }}
          </component>
          <span v-if="block.collapsible" class="rounded-full bg-gray-100 px-2 py-1 text-xs font-black text-gray-500">
            {{ collapsedHeadings[block.id] ? '+' : '-' }}
          </span>
        </div>

        <div
          v-else-if="block.type === 'paragraph'"
          class="team-about-content rounded-xl bg-white p-4 text-gray-700 shadow-sm"
          v-html="block.html"
        />

        <div v-else-if="block.type === 'gallery'" class="rounded-xl bg-white p-3 shadow-sm sm:p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="text-lg font-black text-gray-950">{{ block.title }}</h3>
            <div class="flex gap-1">
              <button type="button" class="icon-btn" @click="prevGallery(block.id)">‹</button>
              <button type="button" class="icon-btn" @click="nextGallery(block.id, block.images.length)">›</button>
            </div>
          </div>
          <div v-if="block.images.length" class="overflow-hidden rounded-lg bg-gray-100">
            <img
              :src="block.images[galleryIndex(block.id)]?.url"
              :alt="block.images[galleryIndex(block.id)]?.alt"
              class="aspect-video w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div v-if="block.images.length > 1" class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
            <button
              v-for="(image, imageIndex) in block.images"
              :key="image.id"
              type="button"
              class="overflow-hidden rounded-md border"
              :class="galleryIndex(block.id) === imageIndex ? 'border-blue-600' : 'border-transparent'"
              @click="galleryIndexes[block.id] = imageIndex"
            >
              <img :src="image.url" :alt="image.alt" class="aspect-video w-full object-cover" loading="lazy" decoding="async" />
            </button>
          </div>
        </div>

        <div v-else-if="!block.hidden" class="rounded-xl bg-white p-4 shadow-sm">
          <h3 class="text-xl font-black text-gray-950">{{ block.title }}</h3>
          <div v-if="block.items.length" class="mt-4 flex flex-wrap gap-3">
            <template v-for="item in block.items" :key="item.id">
              <component
                :is="hallItemLink(item) ? 'a' : 'div'"
                :href="hallItemLink(item) || undefined"
                :target="item.linkType === 'external' ? '_blank' : undefined"
                :rel="item.linkType === 'external' ? 'noopener noreferrer' : undefined"
                class="hall-item"
                :style="{ marginBottom: `${item.breakAfter ? 0 : item.spacingAfter}px` }"
              >
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.label || item.mvpPlayerName || 'Hall of fame item'"
                  class="h-16 w-16 object-contain sm:h-20 sm:w-20"
                  loading="lazy"
                  decoding="async"
                />
                <div v-if="item.label || item.mvpPlayerName || item.mvpSeason" class="min-w-0">
                  <div v-if="item.label" class="text-xs font-black uppercase text-gray-400">{{ item.label }}</div>
                  <div v-if="item.mvpPlayerName" class="truncate text-sm font-black text-gray-950">{{ item.mvpPlayerName }}</div>
                  <div v-if="item.mvpSeason" class="text-xs font-bold text-gray-500">{{ item.mvpSeason }}</div>
                </div>
              </component>
              <div v-if="item.breakAfter" class="basis-full" :style="{ height: `${item.spacingAfter}px` }"></div>
            </template>
          </div>
          <div v-else class="mt-4 rounded-lg border border-dashed border-gray-200 p-4 text-sm font-semibold text-gray-400">
            Зал славы пока пуст.
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../../../../stores/auth'
import { useTeamAbout } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamAbout'
import type { TeamAboutBlock, TeamAboutHallOfFameItem, TeamAboutHeadingBlock, TeamAboutParagraphBlock } from '../../../../types/teamAbout'

const props = defineProps<{
  teamAbbr: string
}>()

const auth = useAuthStore()
const teamAbbrRef = computed(() => props.teamAbbr)

const {
  draftBlocks,
  publishedBlocks,
  hasContent,
  loading,
  saving,
  error,
  isEditing,
  startEditing,
  cancelEditing,
  addBlock,
  removeBlock,
  moveBlock,
  addGalleryImage,
  removeGalleryImage,
  uploadGalleryImage,
  addHallOfFameItem,
  removeHallOfFameItem,
  moveHallOfFameItem,
  uploadHallOfFameImage,
  save
} = useTeamAbout(teamAbbrRef)

const draggedIndex = ref<number | null>(null)
const paragraphEditors = new Map<string, HTMLElement>()
const activeParagraphId = ref('')
const collapsedHeadings = reactive<Record<string, boolean>>({})
const galleryIndexes = reactive<Record<string, number>>({})

const blockLabel = (type: TeamAboutBlock['type']) => ({
  paragraph: 'Абзац',
  heading: 'Заголовок',
  gallery: 'Галерея',
  hallOfFame: 'Зал славы'
}[type])

const setParagraphEditor = (id: string, el: unknown) => {
  if (el instanceof HTMLElement) {
    paragraphEditors.set(id, el)
  } else {
    paragraphEditors.delete(id)
  }
}

const syncParagraph = (block: TeamAboutParagraphBlock) => {
  block.html = paragraphEditors.get(block.id)?.innerHTML ?? block.html
}

const formatParagraph = (id: string, command: string, value?: string) => {
  const editor = paragraphEditors.get(id)
  if (!editor) return
  editor.focus()
  document.execCommand(command, false, value)
  const block = draftBlocks.value.find(item => item.id === id)
  if (block?.type === 'paragraph') syncParagraph(block)
}

const addParagraphLink = (id: string) => {
  const url = window.prompt('URL ссылки')
  if (!url) return
  formatParagraph(id, 'createLink', url)
}

const hallItemLink = (item: TeamAboutHallOfFameItem) => {
  const url = item.playerUrl.trim()
  if (!url) return ''

  if (item.linkType === 'external') return url

  return url.startsWith('/') ? url : `/${url}`
}

const syncAllParagraphs = () => {
  draftBlocks.value.forEach(block => {
    if (block.type === 'paragraph') {
      syncParagraph(block)
    }
  })
}

const saveAbout = async () => {
  syncAllParagraphs()
  await save()
}

const dropBlock = (index: number) => {
  if (draggedIndex.value === null) return
  moveBlock(draggedIndex.value, index)
  draggedIndex.value = null
}

const toggleHeading = (block: TeamAboutHeadingBlock) => {
  if (!block.collapsible) return
  collapsedHeadings[block.id] = !collapsedHeadings[block.id]
}

const visibleBlocks = computed(() => {
  const result: TeamAboutBlock[] = []
  let hiddenByHeading = false

  for (const block of publishedBlocks.value) {
    if (block.type === 'heading') {
      result.push(block)
      hiddenByHeading = block.collapsible && collapsedHeadings[block.id]
      continue
    }

    if (!hiddenByHeading) result.push(block)
  }

  return result
})

const galleryIndex = (blockId: string) => galleryIndexes[blockId] ?? 0

const nextGallery = (blockId: string, length: number) => {
  if (!length) return
  galleryIndexes[blockId] = (galleryIndex(blockId) + 1) % length
}

const prevGallery = (blockId: string) => {
  const block = publishedBlocks.value.find(item => item.id === blockId)
  const length = block?.type === 'gallery' ? block.images.length : 0
  if (!length) return
  galleryIndexes[blockId] = (galleryIndex(blockId) - 1 + length) % length
}

watch(publishedBlocks, blocks => {
  Object.keys(collapsedHeadings).forEach(key => delete collapsedHeadings[key])

  blocks.forEach(block => {
    if (block.type === 'heading' && block.collapsible) {
      collapsedHeadings[block.id] = block.collapsedByDefault
    }
  })
}, { immediate: true })
</script>

<style scoped>
.editor-tool,
.mini-tool,
.icon-btn {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  color: #374151;
  font-size: 0.8rem;
  font-weight: 900;
  padding: 0.5rem 0.7rem;
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
}

.editor-tool:hover,
.mini-tool:hover,
.icon-btn:hover {
  border-color: #111827;
  color: #111827;
}

.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.field {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 0.65rem;
  outline: none;
  padding: 0.65rem 0.75rem;
}

.field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.label {
  color: #4b5563;
  font-size: 0.8rem;
  font-weight: 900;
}

.team-about-content :deep(a),
.team-about-editor :deep(a) {
  color: #2563eb;
  font-weight: 800;
  text-decoration: underline;
}

.team-about-content :deep(p) {
  line-height: 1.8;
  margin: 0;
}

.hall-item {
  align-items: center;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 0.75rem;
  display: inline-flex;
  gap: 0.75rem;
  min-width: 8rem;
  padding: 0.75rem;
  transition: border-color 0.2s, transform 0.2s;
}

.hall-item:hover {
  border-color: #d1d5db;
  transform: translateY(-1px);
}
</style>
