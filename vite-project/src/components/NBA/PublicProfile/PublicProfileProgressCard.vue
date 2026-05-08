<template>
  <div class="rounded-xl bg-gray-50 p-4">
    <div class="flex items-start gap-3">
      <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm"
          :style="{ borderColor: progressColor }"
      >
        <img
            v-if="imageSrc"
            :src="imageSrc"
            :alt="rule?.title || title"
            class="h-full w-full object-contain"
        >
        <span v-else class="text-lg font-black text-gray-500">{{ fallbackInitial }}</span>
      </div>

      <div class="min-w-0 flex-1">
        <div class="text-xs font-semibold uppercase text-gray-500">{{ title }}</div>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <div class="truncate text-base font-black text-gray-900">
            {{ rule?.title || 'Прогресс не настроен' }}
          </div>
          <span class="rounded-full bg-white px-2 py-1 text-xs font-black text-gray-700 shadow-sm">
            Уровень {{ level }}
          </span>
        </div>
        <p class="mt-1 text-sm font-medium text-gray-500">
          {{ description }}
        </p>
      </div>
    </div>

    <div class="mt-4">
      <div class="mb-1 flex justify-between">
        <span class="text-sm font-medium text-gray-600">{{ count }} / {{ maxGames }}</span>
        <span class="text-sm font-bold text-gray-900">{{ progress }}%</span>
      </div>

      <div class="w-full rounded-full bg-gray-200 h-2.5">
        <div
            class="h-2.5 rounded-full transition-all"
            :style="{ width: `${progress}%`, backgroundColor: progressColor }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileProgressRule } from '../../../composables/NBA/PublicProfile/useProfileProgressRules'
import { getTeamLogo } from '../../../utils/getTeamLogo'

const props = defineProps<{
  title: string
  count: number
  rule: ProfileProgressRule | null
  level: number
  color?: string
  teamAbbr?: string
}>()

const maxGames = computed(() => props.rule?.max_games ?? Math.max(props.count, 1))
const progress = computed(() => Math.min(100, Math.round((props.count / maxGames.value) * 100)))
const progressColor = computed(() => props.color || '#7c3aed')
const fallbackInitial = computed(() => props.title.trim().charAt(0) || 'P')

const imageSrc = computed(() => {
  if (props.rule?.svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(props.rule.svg)}`
  }

  return props.teamAbbr ? getTeamLogo(props.teamAbbr) : ''
})

const description = computed(() => {
  if (!props.rule) return 'Добавьте правило прогресса через админ-форму.'
  if (props.rule.description) return props.rule.description

  return `До ${props.rule.max_games} игр`
})
</script>
