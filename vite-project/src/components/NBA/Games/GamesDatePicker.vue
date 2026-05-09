<template>
  <section class="w-full">
    <div class="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Календарь игр</p>
          <h2 class="mt-1 text-xl font-bold text-gray-950">{{ formatDateTitle(modelValue) }}</h2>
        </div>

        <div class="flex items-center gap-2">
          <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
              @click="openMonthCalendar"
          >
            Месяц
          </button>
          <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
              @click="$emit('today')"
          >
            Сегодня
          </button>
          <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
              aria-label="Предыдущий день"
              @click="$emit('prev')"
          >
            <ChevronLeftIcon class="h-5 w-5" />
          </button>
          <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
              aria-label="Следующий день"
              @click="$emit('next')"
          >
            <ChevronRightIcon class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <button
            v-for="day in visibleDays"
            :key="day"
            type="button"
            class="min-h-24 rounded-lg border p-3 text-left transition"
            :class="day === modelValue
              ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm'
              : 'border-gray-200 bg-gray-50 text-gray-800 hover:border-blue-300 hover:bg-white'"
            @click="$emit('select', day)"
        >
          <span class="block text-xs font-semibold uppercase text-gray-500">{{ formatWeekday(day) }}</span>
          <span class="mt-1 block text-lg font-bold">{{ formatShortDate(day) }}</span>
          <span
              class="mt-3 inline-flex min-h-6 items-center rounded-full px-2 text-xs font-semibold"
              :class="getCount(day) > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'"
          >
            {{ getCountLabel(day) }}
          </span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
          v-if="isMonthCalendarOpen"
          class="fixed inset-0 z-[100] bg-gray-950/55 p-3 sm:p-6"
          @click.self="closeMonthCalendar"
      >
        <div class="mx-auto flex h-full max-w-6xl flex-col rounded-lg bg-white shadow-2xl">
          <div class="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Месячный календарь</p>
              <h2 class="mt-1 text-2xl font-bold text-gray-950">{{ monthTitle }}</h2>
            </div>

            <div class="flex items-center gap-2">
              <button
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                  aria-label="Предыдущий месяц"
                  @click="goToPreviousMonth"
              >
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <button
                  type="button"
                  class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                  @click="syncMonthToSelected"
              >
                Выбранный день
              </button>
              <button
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                  aria-label="Следующий месяц"
                  @click="goToNextMonth"
              >
                <ChevronRightIcon class="h-5 w-5" />
              </button>
              <button
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:border-red-300 hover:text-red-600"
                  aria-label="Закрыть календарь"
                  @click="closeMonthCalendar"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div class="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-bold uppercase text-gray-500">
            <div v-for="weekday in monthWeekdays" :key="weekday" class="py-3">
              {{ weekday }}
            </div>
          </div>

          <div class="grid flex-1 grid-cols-7 auto-rows-fr overflow-hidden">
            <button
                v-for="day in monthDays"
                :key="day.dateKey"
                type="button"
                class="min-h-24 border-b border-r border-gray-200 p-2 text-left transition hover:bg-blue-50 sm:min-h-28 sm:p-3"
                :class="[
                  day.isCurrentMonth ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-400',
                  day.dateKey === modelValue ? 'ring-2 ring-inset ring-blue-600' : ''
                ]"
                @click="selectMonthDate(day.dateKey)"
            >
              <span class="text-base font-bold sm:text-lg">{{ day.day }}</span>
              <span
                  class="mt-2 block w-fit rounded-full px-2 py-1 text-xs font-semibold"
                  :class="getCount(day.dateKey) > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'"
              >
                {{ getCountLabel(day.dateKey) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { DateGameCount } from '../../../composables/NBA/games/useGamesByDate'
import { useGamesDatePicker } from '../../../composables/NBA/games/useGamesDatePicker'

const props = defineProps<{
  modelValue: string
  counts: Record<string, DateGameCount>
}>()

const emit = defineEmits<{
  select: [dateKey: string]
  prev: []
  next: []
  today: []
  visibleChange: [dateKeys: string[]]
}>()

const {
  formatDateTitle,
  formatShortDate,
  formatWeekday,
  visibleDays,
  isMonthCalendarOpen,
  monthWeekdays,
  monthTitle,
  monthDays,
  getCount,
  getCountLabel,
  syncMonthToSelected,
  openMonthCalendar,
  closeMonthCalendar,
  goToPreviousMonth,
  goToNextMonth,
  selectMonthDate
} = useGamesDatePicker(props, emit)
</script>
