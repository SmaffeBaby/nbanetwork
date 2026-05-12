<template>
  <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div class="mb-4 flex flex-col gap-3 border-b border-gray-200 pb-3 md:flex-row md:items-center md:justify-between">
      <h2 class="text-2xl font-black uppercase leading-none tracking-normal text-gray-950 sm:text-3xl">
        Детальная статистика игрока
      </h2>

      <div class="relative w-full md:w-96">
        <button
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100"
            @click="isOpen = !isOpen"
        >
          <span class="flex min-w-0 items-center gap-3">
            <img
                v-if="selectedPlayer"
                :src="getPlayerImage(selectedPlayer)"
                :data-player-id="selectedPlayer.PLAYER_ID"
                @error="handleImageError"
                class="h-9 w-9 shrink-0 rounded-full bg-gray-100 object-cover"
                alt=""
            />
            <span class="min-w-0">
              <strong class="block truncate text-sm font-black text-gray-950">
                {{ selectedPlayer?.name || 'Выберите игрока' }}
              </strong>
              <span v-if="selectedPlayer" class="block text-xs font-bold text-gray-500">
                #{{ selectedPlayer.jerseyNum || '-' }} {{ selectedPlayer.position || '' }}
              </span>
            </span>
          </span>

          <svg
              class="h-4 w-4 shrink-0 transition-transform"
              :class="isOpen ? 'rotate-180' : ''"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 10 6"
          >
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 4 4 4-4" />
          </svg>
        </button>

        <div
            v-if="isOpen"
            class="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        >
          <div class="border-b border-gray-200 p-2">
            <input
                v-model="search"
                type="search"
                placeholder="Найти игрока"
                class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-400 focus:ring-4 focus:ring-gray-100"
            />
          </div>

          <div class="max-h-80 overflow-auto py-1">
            <div
                v-for="group in groupedPlayers"
                :key="group.key"
            >
              <div
                  v-if="group.players.length"
                  class="sticky top-0 z-10 bg-gray-100 px-3 py-1.5 text-xs font-black uppercase text-gray-600"
              >
                {{ group.label }}
              </div>

              <button
                  v-for="player in group.players"
                  :key="player.PLAYER_ID"
                  type="button"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-gray-50"
                  @click="selectPlayer(player.PLAYER_ID)"
              >
                <img
                    :src="getPlayerImage(player)"
                    :data-player-id="player.PLAYER_ID"
                    @error="handleImageError"
                    class="h-9 w-9 shrink-0 rounded-full bg-gray-100 object-cover"
                    alt=""
                />
                <span class="min-w-0">
                  <strong class="block truncate text-sm font-black text-gray-950">{{ player.name }}</strong>
                  <span class="block text-xs font-bold text-gray-500">
                    {{ player.minutes }} MIN · {{ player.points }} PTS
                  </span>
                </span>
              </button>
            </div>

            <div
                v-if="!filteredPlayers.length"
                class="px-3 py-8 text-center text-sm font-semibold text-gray-500"
            >
              Игрок не найден.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedDetails" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
          v-for="group in selectedDetails.groups"
          :key="group.key"
          class="rounded-lg border border-gray-200 bg-gray-50 p-3"
      >
        <div class="mb-3 text-center text-sm font-black uppercase text-gray-950">
          {{ group.title }}
        </div>

        <div class="grid gap-3">
          <StatBar
              v-for="segment in group.segments"
              :key="segment.key"
              :label="segment.label"
              :value="segment.value"
              :percent="segment.percent"
              :color="segment.color"
          />
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
      Нет игроков для детальной статистики.
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  usePlayerExcelStats
} from '../../../../composables/NBA/GameFinal/BoxScore/usePlayerExcelStats'

const props = defineProps<{
  players: any[]
  recap: any
  getPlayerImage: (p: any) => string
  handleImageError: (e: Event) => void
}>()

const {
  StatBar,
  selectedPlayer,
  selectedDetails,
  isOpen,
  search,
  filteredPlayers,
  groupedPlayers,
  selectPlayer
} = usePlayerExcelStats(props)
</script>
