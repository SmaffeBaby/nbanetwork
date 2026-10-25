<template>
  <section class="mx-auto max-w-[1344px] space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <button
        v-if="isAdmin"
        type="button"
        class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-gray-700 dark:text-slate-200 shadow-sm transition hover:border-gray-900 hover:text-gray-950"
        @click="startCreate"
      >
        {{ showForm && !editingSlide ? 'Закрыть' : 'Добавить слайд' }}
      </button>
    </div>

    <form v-if="isAdmin && showForm" class="grid gap-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm md:grid-cols-[1fr_1fr_1fr_9rem_auto]" @submit.prevent="saveSlide">
      <h2 class="m-0 text-lg font-black text-gray-950 dark:text-slate-100 md:col-span-5">
        {{ editingSlide ? 'Редактировать слайд' : 'Добавить слайд' }}
      </h2>
      <label class="block space-y-2">
        <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Фото ПК 1344x432</span>
        <input type="file" accept="image/*" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" @change="attachImage($event, 'desktop')" />
        <input v-model="imageUrl" type="text" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="или /storage/v1/object/public/123/main-slider/news.png" />
        <span v-if="imageUpload" class="block truncate text-xs font-semibold text-gray-400">Файл выбран, будет загружен в Storage</span>
      </label>
      <label class="block space-y-2">
        <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Фото мобильное 616x747</span>
        <input type="file" accept="image/*" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" @change="attachImage($event, 'mobile')" />
        <input v-model="mobileImageUrl" type="text" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="или /storage/v1/object/public/123/main-slider/mobile.png" />
        <span v-if="mobileImageUpload" class="block truncate text-xs font-semibold text-gray-400">Файл выбран, будет загружен в Storage</span>
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Ссылка</span>
        <input v-model="linkUrl" type="url" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="https://..." />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Сортировка</span>
        <input v-model.number="sortOrder" type="number" min="1" step="1" class="w-full rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm font-bold outline-none focus:border-blue-500" />
      </label>
      <div class="flex gap-2 self-end">
        <button
          type="submit"
          :disabled="saving || !hasDesktopImage"
          class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ saving ? 'Сохраняем...' : 'Сохранить' }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-gray-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 transition hover:border-gray-900"
          @click="cancelForm"
        >
          Отмена
        </button>
      </div>
      <p v-if="formError" class="md:col-span-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{{ formError }}</p>
    </form>

    <div v-if="loading" class="grid aspect-[616/747] place-items-center rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-gray-500 dark:text-slate-400 sm:aspect-[1344/432]">
      Загружаем новости...
    </div>

    <div v-else-if="loadError" role="alert" class="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-sm text-gray-600 dark:text-slate-300">
      Не удалось загрузить слайды.
      <button type="button" class="ml-2 font-bold text-blue-600" @click="retrySlides">Повторить</button>
    </div>

    <p v-if="formError && !showForm" role="alert" class="text-sm font-semibold text-red-700">{{ formError }}</p>

    <div v-if="slides.length && activeSlide" id="news-carousel" class="relative mx-auto w-full max-w-[1344px]">
      <div class="relative aspect-[616/747] overflow-hidden rounded-2xl bg-gray-950 shadow-xl sm:aspect-[1344/432]">
        <component
          :is="slide.link_url ? 'a' : 'div'"
          v-for="(slide, index) in slides"
          :key="slide.id"
          :href="slide.link_url || undefined"
          :aria-hidden="index !== activeIndex"
          :tabindex="index === activeIndex && slide.link_url ? 0 : -1"
          target="_blank"
          rel="noopener noreferrer"
          class="news-slide absolute inset-0 block"
          :class="index === activeIndex ? 'news-slide-visible' : 'news-slide-hidden'"
        >
          <picture>
            <source v-if="slide.mobile_image_url" :srcset="slide.mobile_image_url" media="(max-width: 639px)" />
            <img
              :src="slide.image_url"
              :loading="index === activeIndex ? 'eager' : 'lazy'"
              :fetchpriority="index === activeIndex ? 'high' : 'low'"
              decoding="async"
              class="absolute left-1/2 top-1/2 block h-full w-full -translate-x-1/2 -translate-y-1/2 sm:object-cover"
              :class="slide.mobile_image_url ? 'object-cover' : 'object-contain'"
              :alt="`Слайд ${index + 1}`"
            />
          </picture>
          <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent"></div>
        </component>

        <div class="absolute bottom-3 left-1/2 z-30 flex max-w-[calc(100%-7rem)] -translate-x-1/2 gap-2 overflow-x-auto rounded-full bg-black/20 px-2 py-1.5 backdrop-blur-sm sm:bottom-5 sm:gap-3 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <button
            v-for="(_, index) in slides"
            :key="index"
            type="button"
            class="h-2.5 w-2.5 shrink-0 rounded-full transition sm:h-3 sm:w-3"
            :class="index === activeIndex ? 'bg-white dark:bg-slate-900' : 'bg-white/45 hover:bg-white/75'"
            :aria-current="index === activeIndex"
            :aria-label="`Slide ${index + 1}`"
            @click="goToSlide(index)"
          ></button>
        </div>

        <button type="button" class="group absolute start-0 top-0 z-30 flex h-full cursor-pointer items-center justify-center px-2 focus:outline-none sm:px-4" @click="prevSlide">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-gray-950 dark:text-slate-100 shadow-lg shadow-black/20 ring-1 ring-black/5 transition group-hover:scale-105 group-hover:bg-gray-50 group-focus:outline-none group-focus:ring-4 group-focus:ring-white/80 sm:h-10 sm:w-10">
            <ChevronLeftIcon class="h-5 w-5" aria-hidden="true" />
            <span class="sr-only">Previous</span>
          </span>
        </button>
        <button type="button" class="group absolute end-0 top-0 z-30 flex h-full cursor-pointer items-center justify-center px-2 focus:outline-none sm:px-4" @click="nextSlide">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-gray-950 dark:text-slate-100 shadow-lg shadow-black/20 ring-1 ring-black/5 transition group-hover:scale-105 group-hover:bg-gray-50 group-focus:outline-none group-focus:ring-4 group-focus:ring-white/80 sm:h-10 sm:w-10">
            <ChevronRightIcon class="h-5 w-5" aria-hidden="true" />
            <span class="sr-only">Next</span>
          </span>
        </button>

        <div v-if="isAdmin" class="absolute right-4 top-4 z-30 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-xs font-black text-gray-800 dark:text-slate-200 shadow-sm transition hover:bg-white dark:hover:bg-slate-800"
            @click="startEdit(activeSlide)"
          >
            Редактировать
          </button>
          <button
            type="button"
            class="rounded-xl bg-white/90 dark:bg-slate-900/90 px-3 py-2 text-xs font-black text-red-700 shadow-sm transition hover:bg-white dark:hover:bg-slate-800"
            @click="deleteSlide(activeSlide)"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="!loading && !loadError && isAdmin" class="rounded-2xl border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-6 text-center text-sm font-semibold text-gray-500 dark:text-slate-400">
      Добавьте первый слайд с фото и ссылкой.
    </div>
  </section>
</template>

<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { useNewsSlider } from '../../composables/News/useNewsSlider'

const {
  slides,
  activeIndex,
  loading,
  loadError,
  retrySlides,
  saving,
  showForm,
  editingSlide,
  imageUrl,
  mobileImageUrl,
  imageUpload,
  mobileImageUpload,
  hasDesktopImage,
  linkUrl,
  sortOrder,
  formError,
  isAdmin,
  activeSlide,
  attachImage,
  startCreate,
  startEdit,
  cancelForm,
  saveSlide,
  deleteSlide,
  goToSlide,
  nextSlide,
  prevSlide
} = useNewsSlider()
</script>

<style scoped>
.news-slide {
  transition: opacity 420ms ease;
}

.news-slide-visible {
  opacity: 1;
  visibility: visible;
  z-index: 2;
}

.news-slide-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
  .news-slide {
    transition: none;
  }
}
</style>
