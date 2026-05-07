<template>
  <div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="text-xs font-semibold uppercase tracking-wide text-blue-600">
          VK Video
        </div>
        <h2 class="mt-1 text-xl font-bold text-gray-950">
          Трансляция матча
        </h2>
      </div>

      <a
          href="https://vkvideo.ru/playlist/-202211208_8"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-900 hover:text-gray-950 hover:no-underline"
      >
        Плейлист VK
      </a>
    </div>

    <div
        v-if="loading"
        class="rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500"
    >
      Ищем трансляцию по командам и дате МСК...
    </div>

    <div
        v-else-if="error"
        class="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-600"
    >
      {{ error }}
    </div>

    <div v-else-if="broadcast?.status === 'found'" class="space-y-4">
      <div class="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
            :src="broadcast.video.embedUrl"
            class="h-full w-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;"
            allowfullscreen
            frameborder="0"
            loading="lazy"
        />
      </div>

      <div class="space-y-2">
        <h3 class="text-lg font-semibold leading-snug text-gray-950">
          {{ broadcast.video.title }}
        </h3>

        <div class="flex flex-wrap gap-2 text-xs text-gray-500">
          <span
              v-if="broadcast.video.publishedAtMSK?.label"
              class="rounded-lg bg-gray-100 px-3 py-1"
          >
            {{ broadcast.video.publishedAtMSK.label }}
          </span>

          <span
              v-if="broadcast.match?.score"
              class="rounded-lg bg-gray-100 px-3 py-1"
          >
            Match score: {{ broadcast.match.score }}
          </span>
        </div>
      </div>

      <div
          v-if="broadcast.alternatives?.length"
          class="rounded-xl border border-gray-100 bg-gray-50 p-4"
      >
        <div class="mb-2 text-xs font-semibold uppercase text-gray-500">
          Похожие трансляции
        </div>

        <div class="space-y-2">
          <a
              v-for="item in broadcast.alternatives"
              :key="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="block text-sm text-gray-700 hover:text-gray-950"
          >
            {{ item.title }}
          </a>
        </div>
      </div>
    </div>

    <div
        v-else
        class="rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-600"
    >
      {{ broadcast?.message || 'Трансляция для этого матча пока не найдена.' }}

      <div
          v-if="broadcast?.target?.dateMSK?.label"
          class="mt-3 text-xs text-gray-500"
      >
        Дата матча: {{ broadcast.target.dateMSK.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{
  gameId: string
}>()

const broadcast = ref<any>(null)
const loading = ref(false)
const error = ref('')

const fetchBroadcast = async () => {
  if (!props.gameId) return

  loading.value = true
  error.value = ''

  try {
    const response = await fetch(`/api/game-broadcast/${props.gameId}`)

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.message || data?.error || 'Не удалось загрузить трансляцию')
    }

    broadcast.value = await response.json()
  } catch (err: any) {
    error.value = err?.message || 'Не удалось загрузить трансляцию'
  } finally {
    loading.value = false
  }
}

onMounted(fetchBroadcast)

watch(
    () => props.gameId,
    () => fetchBroadcast()
)
</script>
