<template>
  <section
    class="relative isolate overflow-visible rounded-[28px] border border-white/70 bg-white/35 text-slate-950 shadow-[0_24px_90px_rgba(37,99,235,0.16)] ring-1 ring-white/40 backdrop-blur-2xl backdrop-saturate-150"
  >
    <div class="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 py-12 text-center sm:px-8 lg:px-12 lg:py-16">
      <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-3 py-1.5 text-sm font-semibold text-blue-800 shadow-lg shadow-blue-950/10 backdrop-blur-xl">
        <SparklesIcon class="h-4 w-4 text-red-500" aria-hidden="true" />
        NBA Dashboard
        <ChevronRightIcon class="h-4 w-4 text-blue-400" aria-hidden="true" />
      </div>

      <h1 class="m-0 max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
        Будущее NBA-статистики
      </h1>
      <p class="mt-5 max-w-2xl text-base font-semibold leading-7 text-blue-800 sm:text-xl">
        Создано фанатом. Разработано для фанатов.
      </p>
      <p class="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
        Следите за статистикой, изучайте аналитику и открывайте быстрые NBA-сервисы на современной платформе с удобным интерфейсом.
      </p>

      <div ref="searchRoot" class="relative z-30 mt-8 w-full max-w-2xl">
        <form class="relative" @submit.prevent="submitSearch">
          <label for="home-global-search" class="sr-only">Поиск</label>
          <div class="relative">
            <MagnifyingGlassIcon
              class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="home-global-search"
              v-model="search"
              type="search"
              autocomplete="off"
              class="h-14 w-full rounded-2xl border border-white/80 bg-white/70 px-12 pr-32 text-base font-semibold text-slate-950 shadow-xl shadow-blue-950/10 outline-none backdrop-blur-xl transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white/85 focus:ring-4 focus:ring-blue-500/20"
              placeholder="Команда, игрок, раздел или профиль"
              @focus="isOpen = true"
              @keydown.down.prevent="moveActive(1)"
              @keydown.up.prevent="moveActive(-1)"
              @keydown.enter.prevent="submitSearch"
              @keydown.esc="isOpen = false"
            />
            <button
              type="submit"
              class="absolute right-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
            >
              <MagnifyingGlassIcon class="h-4 w-4" aria-hidden="true" />
              Найти
            </button>
          </div>
        </form>

        <div
          v-if="isOpen && (search.trim() || quickLinks.length)"
          class="absolute left-0 right-0 top-full z-[90] mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white text-left text-slate-950 shadow-2xl shadow-slate-950/25"
        >
          <div v-if="search.trim()" class="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase text-slate-500">
            Результаты по запросу "{{ search.trim() }}"
          </div>

          <div v-if="visibleResults.length" class="max-h-[420px] overflow-y-auto p-2">
            <button
              v-for="(item, index) in visibleResults"
              :key="`${item.type}-${item.id}`"
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition"
              :class="activeIndex === index ? 'bg-blue-50' : 'hover:bg-slate-50'"
              @mouseenter="activeIndex = index"
              @click="openResult(item)"
            >
              <span class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="item.title"
                  :data-player-id="item.playerId"
                  class="h-full w-full"
                  :class="item.type === 'player' || item.type === 'profile' ? 'object-cover' : 'object-contain p-1'"
                  @error="handleResultImageError"
                />
                <component v-else :is="item.icon" class="h-5 w-5 text-slate-600" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-black text-slate-950">{{ item.title }}</span>
                <span class="block truncate text-xs font-semibold text-slate-500">{{ item.subtitle }}</span>
              </span>
              <span class="rounded-full px-2.5 py-1 text-[11px] font-black uppercase" :class="typeBadgeClass(item.type)">
                {{ typeLabels[item.type] }}
              </span>
            </button>
          </div>

          <div v-else-if="isLoadingAny" class="flex items-center gap-3 px-5 py-6 text-sm font-semibold text-slate-500">
            <ArrowPathIcon class="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
            Ищем игроков и профили...
          </div>

          <div v-else-if="search.trim()" class="px-5 py-6 text-sm font-semibold text-slate-500">
            Ничего не найдено. Попробуйте ввести фамилию игрока, аббревиатуру команды или название раздела.
          </div>

          <div v-if="!search.trim()" class="p-2">
            <div class="px-3 py-2 text-xs font-bold uppercase text-slate-500">Быстрый старт</div>
            <button
              v-for="item in quickLinks"
              :key="item.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
              @click="openResult(item)"
            >
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                <component :is="item.icon" class="h-5 w-5 text-slate-600" aria-hidden="true" />
              </span>
              <span>
                <span class="block text-sm font-black text-slate-950">{{ item.title }}</span>
                <span class="block text-xs font-semibold text-slate-500">{{ item.subtitle }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <button
          v-for="item in quickLinks"
          :key="`chip-${item.id}`"
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:border-blue-300 hover:bg-white/70 hover:text-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/15"
          @click="openResult(item)"
        >
          <component :is="item.icon" class="h-4 w-4" aria-hidden="true" />
          {{ item.title }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  ArrowPathIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/vue/24/outline'
import { useHomeSearch } from '../../composables/Home/useHomeSearch'

const {
  searchRoot,
  search,
  isOpen,
  activeIndex,
  quickLinks,
  visibleResults,
  isLoadingAny,
  typeLabels,
  typeBadgeClass,
  handleResultImageError,
  openResult,
  submitSearch,
  moveActive
} = useHomeSearch()
</script>
