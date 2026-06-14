<template>
  <div class="space-y-2">
    <div
        v-for="line in lines"
        :key="line.key"
        class="flex flex-col items-start justify-between gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm sm:flex-row sm:items-center sm:gap-3"
        :style="{ borderColor: `${line.color}66` }"
    >
      <div class="flex min-w-0 items-center gap-2">
        <span class="h-3 w-3 shrink-0 rounded-full" :style="{ backgroundColor: line.color }"></span>
        <span class="min-w-0 font-bold leading-snug text-gray-700 sm:truncate">{{ getCapRule(line.key).title }}</span>
        <button
            type="button"
            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            :aria-label="`Что значит ${getCapRule(line.key).title}`"
            @click="selectedKey = line.key"
        >
          <QuestionMarkCircleIcon class="h-4 w-4" />
        </button>
      </div>
      <span class="whitespace-nowrap font-black sm:text-right" :style="{ color: line.color }">{{ formatMoney(line.value) }}</span>
    </div>
  </div>

  <Teleport to="body">
    <div
        v-if="selectedRule"
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 py-6"
        @click.self="selectedKey = null"
    >
      <div class="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-wide text-blue-600">
              Финансовое правило NBA
            </p>
            <h3 class="mt-1 text-xl font-black text-gray-950">
              {{ selectedRule.title }}
            </h3>
          </div>
          <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
              aria-label="Закрыть"
              @click="selectedKey = null"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <p class="mt-4 text-sm leading-6 text-gray-600">
          {{ selectedRule.description }}
        </p>

        <div class="mt-4 rounded-lg bg-gray-50 p-4">
          <div class="text-sm font-black text-gray-900">
            Что команде нельзя или сложнее делать
          </div>
          <ul class="mt-3 space-y-2 text-sm leading-5 text-gray-600">
            <li
                v-for="restriction in selectedRule.restrictions"
                :key="restriction"
                class="flex gap-2"
            >
              <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"></span>
              <span>{{ restriction }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useSalaryCapRules } from '../../../composables/NBA/Contracts/useSalaryCapRules'
import type { ContractCapKey } from '../../../composables/NBA/Contracts/useTeamContracts'

type CapLine = {
  key: ContractCapKey
  label: string
  color: string
  value: number
}

defineProps<{
  lines: CapLine[]
  formatMoney: (value: number | null | undefined) => string
}>()

const selectedKey = ref<ContractCapKey | null>(null)
const { getCapRule } = useSalaryCapRules()

const selectedRule = computed(() =>
    selectedKey.value ? getCapRule(selectedKey.value) : null
)
</script>
