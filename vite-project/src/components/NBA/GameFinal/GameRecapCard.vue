<template>
  <div
      v-if="recap"
      class="p-6 rounded-2xl shadow-md bg-white border border-gray-100"
  >
    <article v-if="apRecap" class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div class="space-y-1">
          <div class="text-xs font-semibold uppercase tracking-wide text-red-600">
            AP NBA
          </div>

          <div class="text-xs text-gray-500">
            {{ apRecap.byline || 'Associated Press' }}
            <span v-if="formattedApDate"> · {{ formattedApDate }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
                type="button"
                class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                :class="selectedLanguage === 'en'
                ? 'bg-white text-gray-950 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'"
                @click="selectedLanguage = 'en'"
            >
              EN
            </button>

            <button
                type="button"
                class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                :class="selectedLanguage === 'ru'
                ? 'bg-white text-gray-950 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'"
                @click="selectedLanguage = 'ru'"
            >
              RU
            </button>
          </div>

          <a
              v-if="apRecap.sourceUrl"
              :href="apRecap.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-900 hover:text-gray-950 hover:no-underline"
          >
            Читать AP
          </a>
        </div>
      </div>

      <img
          v-if="apRecap.image"
          :src="apRecap.image"
          :alt="displayApRecap.title"
          class="max-h-[360px] w-full rounded-xl object-cover"
      />

      <div class="space-y-3">
        <h2 class="text-2xl font-bold leading-tight text-gray-950">
          {{ displayApRecap.title || recap.title }}
        </h2>

        <div class="text-sm font-semibold text-gray-500">
          {{ selectedLanguage === 'ru' ? 'Обзор матча' : 'Game Recap' }}
        </div>
      </div>

      <div
          v-if="translationLoading || translationError"
          class="rounded-lg border px-3 py-2 text-sm"
          :class="translationError
          ? 'border-red-100 bg-red-50 text-red-600'
          : 'border-gray-100 bg-gray-50 text-gray-500'"
      >
        {{ translationError || 'Переводим статью...' }}
      </div>

      <div class="space-y-4 text-[15px] leading-7 text-gray-800">
        <p
            v-for="(paragraph, i) in displayApRecap.paragraphs || []"
            :key="i"
        >
          {{ paragraph }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <span
            v-if="recap.insight"
            class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
        >
          {{ recap.insight }}
        </span>

        <span
            v-for="(q, i) in recap.quarters || []"
            :key="i"
            class="rounded-lg bg-gray-50 px-3 py-1 text-xs text-gray-600"
        >
          {{ q }}
        </span>
      </div>
    </article>

    <div v-else class="space-y-5">
      <div class="flex justify-left mb-2">
        <img
            src="/logos/RE_AI.svg"
            alt="RE AI"
            class="h-35 w-35 opacity-80"
        />
      </div>

      <div class="flex justify-between items-center">
        <span class="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
          {{ recap.insight || '—' }}
        </span>
      </div>

      <div class="space-y-3">
        <div
            v-for="(line, i) in recap.storyline || []"
            :key="i"
            class="
        group
        relative
        p-3
        rounded-xl
        border border-gray-100
        bg-gray-50
        hover:bg-white
        hover:shadow-sm
        transition-all
        duration-200
        overflow-hidden
      "
        >

          <div class="absolute left-0 top-0 h-full w-1 bg-gray-200 group-hover:bg-blue-400 transition-colors"></div>

          <div
              class="text-sm text-gray-800 leading-relaxed pl-3"
              v-html="line"
          />
        </div>
      </div>

      <div
          v-if="recap.mvp"
          class="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-4"
      >
        <div class="w-12 h-12 shrink-0">
          <img
              v-if="recap.mvp?.PLAYER_ID"
              :src="getPlayerImage(recap.mvp)"
              :data-player-id="recap.mvp.PLAYER_ID"
              @error="handleImageError"
              class="w-12 h-12 rounded-full object-cover border border-yellow-300"
              alt="MVP"
          />

          <div
              v-else
              class="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center text-sm font-semibold text-yellow-700"
          >
            {{ getInitials(recap.mvp?.name) }}
          </div>
        </div>

        <div>
          <div class="text-xs uppercase text-yellow-600 font-semibold">
            MVP
          </div>

          <router-link
              v-if="recap.mvp?.name"
              :to="{ name: 'PlayerPage', params: { name: recap.mvp.name } }"
              class="text-lg font-semibold text-gray-900 hover:underline"
          >
            {{ recap.mvp.name }}
          </router-link>

          <div v-else class="text-lg font-semibold text-gray-900">
            —
          </div>

          <div class="text-sm text-gray-600">
            {{ recap.mvp?.stats || '' }}
          </div>
        </div>
      </div>

      <div
          v-if="recap.runs"
          class="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100"
          v-html="recap.runs"
      />

      <div
          v-if="recap.clutch"
          class="bg-gray-50 border border-gray-100 p-4 rounded-xl"
      >
        <div class="text-xs text-gray-500 mb-1">Clutch</div>
        <div class="text-sm text-gray-800">
          {{ recap.clutch }}
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <div
            v-for="(q, i) in recap.quarters || []"
            :key="i"
            class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-lg"
        >
          {{ q }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getPlayerImage, handleImageError } from '../../../utils/playerImage'

const props = defineProps<{
  recap: any
}>()

const apRecap = computed(() => props.recap?.apRecap || null)
const selectedLanguage = ref<'en' | 'ru'>('en')
const translatedApRecap = ref<any>(null)
const translationLoading = ref(false)
const translationError = ref('')

const displayApRecap = computed(() => {
  if (selectedLanguage.value !== 'ru' || !translatedApRecap.value) {
    return apRecap.value || {}
  }

  return {
    ...apRecap.value,
    ...translatedApRecap.value
  }
})

const formattedApDate = computed(() => {
  const value = apRecap.value?.publishedAt
  if (!value) return ''
  if (String(value).includes('[')) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
})

const loadTranslation = async () => {
  if (!apRecap.value || translatedApRecap.value || translationLoading.value) {
    return
  }

  translationLoading.value = true
  translationError.value = ''

  try {
    const title = apRecap.value?.title || ''
    const paragraphs = apRecap.value?.paragraphs || []
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'en',
        target: 'ru',
        text: [title, ...paragraphs]
      })
    })

    if (!response.ok) {
      throw new Error('Не удалось получить русский перевод')
    }

    const data = await response.json()
    const translated = Array.isArray(data?.text) ? data.text : []

    translatedApRecap.value = {
      title: translated[0] || title,
      paragraphs: translated.slice(1)
    }
  } catch (err: any) {
    selectedLanguage.value = 'en'
    translationError.value = err?.message || 'Не удалось получить русский перевод'
  } finally {
    translationLoading.value = false
  }
}

watch(selectedLanguage, language => {
  if (language === 'ru') {
    loadTranslation()
  }
})

watch(apRecap, () => {
  selectedLanguage.value = 'en'
  translatedApRecap.value = null
  translationError.value = ''
})

const getInitials = (name?: string) => {
  if (!name) return '?'


  return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
}
</script>

<style>
a {
  color: #0e0e0e;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>