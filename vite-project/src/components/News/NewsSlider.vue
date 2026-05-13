<template>
  <section class="mx-auto max-w-7xl space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <button
        v-if="isAdmin"
        type="button"
        class="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-900 hover:text-gray-950"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Закрыть' : 'Добавить слайд' }}
      </button>
    </div>

    <form v-if="isAdmin && showForm" class="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]" @submit.prevent="saveSlide">
      <label class="block">
        <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Фото</span>
        <input type="file" accept="image/*" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm" @change="attachImage" />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Ссылка</span>
        <input v-model="linkUrl" type="url" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="https://..." />
      </label>
      <button
        type="submit"
        :disabled="saving || !imageData"
        class="self-end rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ saving ? 'Сохраняем...' : 'Сохранить' }}
      </button>
      <p v-if="formError" class="md:col-span-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{{ formError }}</p>
    </form>

    <div v-if="loading" class="grid h-56 place-items-center rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-500 md:h-96">
      Загружаем новости...
    </div>

    <div v-else-if="slides.length" id="news-carousel" class="relative w-full" data-carousel="slide">
      <div class="relative h-56 overflow-hidden rounded-2xl bg-gray-950 shadow-xl md:h-96">
        <component
          :is="activeSlide.link_url ? 'a' : 'div'"
          :href="activeSlide.link_url || undefined"
          target="_blank"
          rel="noopener noreferrer"
          class="absolute inset-0 block"
          data-carousel-item
        >
          <img :src="activeSlide.image_url" class="absolute left-1/2 top-1/2 block h-full w-full -translate-x-1/2 -translate-y-1/2 object-cover" alt="News slide" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent"></div>
        </component>
      </div>

      <div class="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 space-x-3 rtl:space-x-reverse">
        <button
          v-for="(_, index) in slides"
          :key="index"
          type="button"
          class="h-3 w-3 rounded-full transition"
          :class="index === activeIndex ? 'bg-white' : 'bg-white/45 hover:bg-white/75'"
          :aria-current="index === activeIndex"
          :aria-label="`Slide ${index + 1}`"
          :data-carousel-slide-to="index"
          @click="activeIndex = index"
        ></button>
      </div>

      <button type="button" class="group absolute start-0 top-0 z-30 flex h-full cursor-pointer items-center justify-center px-4 focus:outline-none" data-carousel-prev @click="prevSlide">
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/30 transition group-hover:bg-white/50 group-focus:outline-none group-focus:ring-4 group-focus:ring-white">
          <ChevronLeftIcon class="h-5 w-5 text-white" />
          <span class="sr-only">Previous</span>
        </span>
      </button>
      <button type="button" class="group absolute end-0 top-0 z-30 flex h-full cursor-pointer items-center justify-center px-4 focus:outline-none" data-carousel-next @click="nextSlide">
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/30 transition group-hover:bg-white/50 group-focus:outline-none group-focus:ring-4 group-focus:ring-white">
          <ChevronRightIcon class="h-5 w-5 text-white" />
          <span class="sr-only">Next</span>
        </span>
      </button>

      <div v-if="isAdmin" class="absolute right-4 top-4 z-30 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xl bg-white/90 px-3 py-2 text-xs font-black text-red-700 shadow-sm transition hover:bg-white"
          @click="deleteSlide(activeSlide)"
        >
          Удалить
        </button>
      </div>
    </div>

    <div v-else-if="isAdmin" class="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-gray-500">
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
  saving,
  showForm,
  imageData,
  linkUrl,
  formError,
  isAdmin,
  activeSlide,
  attachImage,
  saveSlide,
  deleteSlide,
  nextSlide,
  prevSlide
} = useNewsSlider()
</script>
