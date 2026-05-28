<template>
  <div ref="rootEl" class="relative inline-block w-full text-left sm:w-auto">
    <button
      :id="buttonId"
      type="button"
      class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium leading-5 text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:w-auto"
      :aria-expanded="isOpen"
      :aria-controls="menuId"
      @click="toggleMenu"
      @keydown.down.prevent="openMenu"
      @keydown.esc.prevent="closeMenu"
    >
      <span class="min-w-0 truncate">{{ activeOption?.label || placeholder }}</span>
      <span
        v-if="activeOption?.badge"
        class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-bold"
      >
        {{ activeOption.badge }}
      </span>
      <svg class="h-4 w-4 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
      </svg>
    </button>

    <div
      v-show="isOpen"
      :id="menuId"
      class="absolute left-0 z-[100] mt-2 w-full min-w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg sm:w-56"
      role="menu"
      :aria-labelledby="buttonId"
    >
      <template v-for="(option, index) in options" :key="option.value">
        <div v-if="option.dividerBefore && index > 0" class="border-t border-gray-200" />
        <button
          type="button"
          role="menuitemradio"
          class="inline-flex w-full items-center justify-between gap-3 rounded-md p-2 text-left text-sm font-medium transition"
          :class="option.value === modelValue
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-950'"
          :aria-checked="option.value === modelValue"
          @click="selectOption(option.value)"
        >
          <span class="min-w-0 truncate">{{ option.label }}</span>
          <span
            v-if="option.badge"
            class="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold"
            :class="option.value === modelValue ? 'bg-blue-100 text-blue-700' : 'bg-red-500 text-white'"
          >
            {{ option.badge }}
          </span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { CategoryOption, CategoryValue } from '../../types/categories'

const props = withDefaults(defineProps<{
  modelValue: CategoryValue
  options: CategoryOption[]
  placeholder?: string
}>(), {
  placeholder: 'Категории'
})

const emit = defineEmits<{
  'update:modelValue': [value: CategoryValue]
}>()

const rootEl = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const id = Math.random().toString(36).slice(2, 9)
const buttonId = `categories-button-${id}`
const menuId = `categories-menu-${id}`

const activeOption = computed(() =>
  props.options.find(option => option.value === props.modelValue)
)

const closeMenu = () => {
  isOpen.value = false
  document.removeEventListener('click', handleOutsideClick)
}

const openMenu = () => {
  isOpen.value = true
  document.addEventListener('click', handleOutsideClick)
}

const toggleMenu = () => {
  if (isOpen.value) {
    closeMenu()
    return
  }

  openMenu()
}

const selectOption = (value: CategoryValue) => {
  emit('update:modelValue', value)
  closeMenu()
}

function handleOutsideClick(event: MouseEvent) {
  if (!rootEl.value?.contains(event.target as Node)) {
    closeMenu()
  }
}

onBeforeUnmount(closeMenu)
</script>
