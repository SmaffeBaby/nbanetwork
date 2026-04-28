<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
          Сетка
        </div>
        <h3 class="text-xl font-black text-slate-950">
          Плей-офф
        </h3>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="grid grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <button
              v-for="conference in conferences"
              :key="conference"
              type="button"
              class="rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition"
              :class="selectedConference === conference ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-700'"
              @click="selectedConference = conference"
          >
            {{ conference }}
          </button>
        </div>

        <div class="text-sm font-semibold text-slate-500">
          {{ filteredSeries.length }} серий
        </div>
      </div>
    </div>

    <div v-if="filteredSeries.length" class="overflow-x-auto pb-2">
      <div class="grid min-w-[980px] grid-cols-4 gap-4">
        <div
            v-for="round in rounds"
            :key="round"
            class="space-y-3"
        >
          <div class="sticky top-0 z-10 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            {{ round }}
          </div>

          <article
              v-for="item in groupedSeries[round]"
              :key="item.key"
              class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div
                role="button"
                tabindex="0"
                class="w-full cursor-pointer text-left"
                @click="$emit('open-series-modal', item.index)"
                @keydown.enter="$emit('open-series-modal', item.index)"
            >
              <div
                  v-for="team in item.teams"
                  :key="team.name"
                  class="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5"
                  :class="!hideSpoilers && team.name === item.winner ? 'bg-emerald-50' : 'bg-slate-50'"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <button
                      type="button"
                      class="flex min-w-0 items-center gap-2 rounded-lg text-left transition hover:text-emerald-700"
                      @click.stop="$emit('go-team', team.abbr)"
                  >
                    <img
                        :src="team.logo"
                        :alt="team.name"
                        class="h-7 w-7 shrink-0 object-contain"
                    />
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-black text-slate-900">
                        {{ team.name }}
                      </span>
                      <span class="block text-[11px] font-semibold text-slate-400">
                        {{ team.seed || 'Seed TBD' }}
                      </span>
                    </span>
                  </button>
                </div>

                <div class="flex items-center gap-1.5">
                  <span
                      v-for="dot in team.dots"
                      :key="dot.index"
                      class="h-2 w-2 rounded-full"
                      :class="dot.active && !hideSpoilers ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-200'"
                  ></span>
                </div>
              </div>
            </div>

          </article>
        </div>
      </div>
    </div>

    <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
      Нет серий
    </div>
  </section>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import {
  type BracketSeries,
  usePlayoffBracket
} from '../../../composables/NBA/Playoffs/usePlayoffBracket'

const props = defineProps<{
  series: BracketSeries[]
  hideSpoilers: boolean
}>()

defineEmits<{
  (event: 'open-series-modal', index: number): void
  (event: 'go-team', abbr: string): void
}>()

const {
  conferences,
  selectedConference,
  filteredSeries,
  rounds,
  groupedSeries
} = usePlayoffBracket(toRef(props, 'series'))
</script>
