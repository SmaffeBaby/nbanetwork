<template>
  <section v-if="rows.length" class="rounded-xl bg-white p-4 shadow-sm lg:p-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 class="text-xl font-black text-gray-950">
          Таблица контрактов
        </h3>
        <p class="mt-1 text-sm font-medium text-gray-500">
          Зарплаты по сезонам, опции и гарантированные суммы
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
        <span class="inline-flex items-center gap-1.5">
          <span class="h-3 w-3 rounded bg-blue-600"></span>
          Опция игрока
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="h-3 w-3 rounded bg-green-600"></span>
          Опция команды
        </span>
      </div>
    </div>

    <div class="mt-4 space-y-3 md:hidden">
      <article
          v-for="row in rows"
          :key="row.name"
          class="rounded-lg border border-gray-100 bg-gray-50 p-3"
      >
        <div class="flex items-center gap-3">
          <RouterLink :to="row.playerPath" class="shrink-0">
            <img
                v-if="row.image"
                :src="row.image"
                :alt="row.name"
                class="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                @error="hideBrokenImage"
            >
            <span v-else class="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-xs font-black text-gray-500">
              NBA
            </span>
          </RouterLink>

          <div class="min-w-0 flex-1">
            <RouterLink :to="row.playerPath" class="block truncate text-base font-black text-blue-700">
              {{ row.name }}
            </RouterLink>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-500">
              <span>Гарантировано: {{ formatMoney(row.guaranteed) }}</span>
            </div>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <div
              v-for="cell in row.yearSalaries"
              :key="cell.year"
              class="rounded-md bg-white px-2.5 py-2"
              :class="cell.option === 'player' ? 'text-blue-700' : cell.option === 'team' ? 'text-green-700' : 'text-gray-900'"
          >
            <div class="text-[11px] font-black text-gray-500">
              {{ cell.year }}
            </div>
            <div class="mt-0.5 truncate text-sm font-black">
              {{ formatMoney(cell.salary) }}
            </div>
            <div v-if="cell.option" class="mt-1 text-[10px] font-black uppercase">
              {{ cell.option === 'player' ? 'опция игрока' : 'опция команды' }}
            </div>
          </div>
        </div>
      </article>
    </div>

    <div class="mt-4 hidden overflow-x-auto md:block">
      <table class="min-w-[980px] w-full border border-gray-300 text-sm">
        <thead class="bg-gray-100 text-gray-950">
          <tr>
            <th class="sticky left-0 z-10 min-w-[230px] border border-gray-300 bg-gray-100 px-3 py-2 text-left font-black">
              Игрок
            </th>
            <th
                v-for="year in years"
                :key="year"
                class="border border-gray-300 px-3 py-2 text-right font-black"
            >
              {{ year }}
            </th>
            <th class="border border-gray-300 px-3 py-2 text-right font-black">
              Гарантировано
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
              v-for="row in rows"
              :key="row.name"
              class="odd:bg-white even:bg-gray-50"
          >
            <th class="sticky left-0 z-10 border border-gray-200 bg-inherit px-3 py-2 text-left">
              <RouterLink :to="row.playerPath" class="flex min-w-0 items-center gap-2 text-blue-700 hover:text-blue-800">
                <img
                    v-if="row.image"
                    :src="row.image"
                    :alt="row.name"
                    class="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-gray-200"
                    @error="hideBrokenImage"
                >
                <span class="truncate font-bold underline">{{ row.name }}</span>
              </RouterLink>
            </th>
            <td
                v-for="cell in row.yearSalaries"
                :key="`${row.name}-${cell.year}`"
                class="border border-gray-200 px-3 py-2 text-right font-semibold"
                :class="cell.option === 'player' ? 'text-blue-700' : cell.option === 'team' ? 'text-green-700' : 'text-gray-950'"
            >
              {{ formatMoney(cell.salary) }}
            </td>
            <td class="border border-gray-200 px-3 py-2 text-right font-bold text-gray-950">
              {{ formatMoney(row.guaranteed) }}
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-gray-100">
          <tr>
            <th class="sticky left-0 z-10 border border-gray-300 bg-gray-100 px-3 py-2 text-left font-black">
              Итого команды
            </th>
            <td
                v-for="year in years"
                :key="`total-${year}`"
                class="border border-gray-300 px-3 py-2 text-right font-black text-gray-950"
            >
              {{ formatMoney(totals[year]) }}
            </td>
            <td class="border border-gray-300 px-3 py-2 text-right font-black text-gray-950">
              {{ formatMoney(guaranteedTotal) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { RouterLink } from 'vue-router'
import { useContractsTable } from '../../../composables/NBA/Contracts/useContractsTable'
import type { TeamContracts } from '../../../composables/NBA/Contracts/useTeamContracts'

const props = defineProps<{
  contracts: TeamContracts | null
  formatMoney: (value: number | null | undefined) => string
}>()

const { years, rows, totals, guaranteedTotal } = useContractsTable(toRef(props, 'contracts'))

const hideBrokenImage = (event: Event) => {
  const image = event.target as HTMLImageElement
  image.style.display = 'none'
}
</script>
