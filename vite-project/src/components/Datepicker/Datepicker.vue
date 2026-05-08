<template>
  <div ref="rootRef" class="relative w-full max-w-[220px]">
    <div class="relative">
      <div class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
        <svg
            class="h-4 w-4 text-gray-500"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
        >
          <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z"
          />
        </svg>
      </div>

      <button
          type="button"
          class="block h-11 w-full rounded-xl border border-gray-300 bg-white ps-9 pe-3 text-left text-sm font-medium text-gray-900 shadow-sm outline-none transition hover:bg-gray-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
          @click="toggleCalendar"
      >
        {{ formattedSelectedDate || placeholder }}
      </button>
    </div>

    <div
        v-if="isOpen"
        class="absolute left-0 z-50 mt-2 w-[280px] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
    >
      <div class="mb-4 flex items-center justify-between">
        <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
            @click="previousMonth"
        >
          <span class="text-3xl leading-none">‹</span>
        </button>

        <div class="text-base font-bold text-gray-900">
          {{ monthTitle }}
        </div>

        <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
            @click="nextMonth"
        >
          <span class="text-3xl leading-none">›</span>
        </button>
      </div>

      <div class="grid grid-cols-7 gap-y-2 text-center">
        <div
            v-for="day in weekDays"
            :key="day"
            class="text-xs font-bold text-gray-500"
        >
          {{ day }}
        </div>

        <button
            v-for="day in calendarDays"
            :key="day.key"
            type="button"
            class="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sm transition"
            :class="getDayClass(day)"
            :disabled="!day.isAvailable"
            @click="selectDate(day)"
        >
          {{ day.day }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDatePicker } from '../../composables/Datepicker/useDatePicker'

const props = withDefaults(defineProps<{
  modelValue: string
  availableDates: string[]
  minDate?: string
  maxDate?: string
  placeholder?: string
}>(), {
  minDate: '',
  maxDate: '',
  placeholder: 'Выберите дату'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const {
  rootRef,
  isOpen,
  weekDays,
  formattedSelectedDate,
  monthTitle,
  calendarDays,
  getDayClass,
  toggleCalendar,
  selectDate,
  previousMonth,
  nextMonth
} = useDatePicker(props, emit)
</script>