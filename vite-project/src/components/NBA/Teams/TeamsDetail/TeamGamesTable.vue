<template>
  <div class="space-y-4">
    <div class="flex gap-4 items-center">

      <select
          v-model="filter"
          class="px-3 py-2 rounded-lg border text-sm"
      >
        <option value="ALL">Все игры</option>
        <option value="W">Победы</option>
        <option value="L">Поражения</option>
      </select>

      <div class="text-sm text-gray-500">
        Всего: {{ filteredGames.length }}
      </div>

      <label class="flex items-center cursor-pointer ml-auto">
        <input
            type="checkbox"
            class="sr-only"
            v-model="hideScoresModel"
        />

        <div
            class="w-12 h-6 flex items-center rounded-full p-1 transition"
            :class="hideScoresModel ? 'bg-gray-300' : 'bg-blue-500'"
        >
          <div
              class="bg-white w-4 h-4 rounded-full shadow-md transform transition"
              :class="hideScoresModel ? '' : 'translate-x-6'"
          ></div>
        </div>

        <span class="ml-2 text-gray-700 text-sm">
          {{ hideScoresModel ? 'Статы скрыты' : 'Статы видны' }}
        </span>
      </label>

    </div>

    <div class="overflow-x-auto border rounded-xl">
      <table class="min-w-[1200px] w-full text-sm">

        <thead class="bg-gray-100 text-gray-600 text-xs uppercase">
        <tr>
          <th class="p-2">Дата</th>
          <th>Матч</th>

          <th v-if="!hideScoresModel">W/L</th>
          <th v-if="!hideScoresModel">PTS</th>
          <th v-if="!hideScoresModel">REB</th>
          <th v-if="!hideScoresModel">AST</th>
          <th v-if="!hideScoresModel">STL</th>
          <th v-if="!hideScoresModel">BLK</th>
          <th v-if="!hideScoresModel">TOV</th>

          <th>FG%</th>
          <th>3P%</th>
          <th>FT%</th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="game in filteredGames"
            :key="game.Game_ID"
            class="border-t hover:bg-gray-50"
        >
          <td class="p-2">{{ game.GAME_DATE }}</td>
          <td>{{ game.MATCHUP }}</td>

          <template v-if="!hideScoresModel">
            <td>
                <span
                    :class="game.WL === 'W'
                    ? 'text-green-600 font-bold'
                    : 'text-red-500 font-bold'"
                >
                  {{ game.WL }}
                </span>
            </td>

            <td>{{ game.PTS }}</td>
            <td>{{ game.REB }}</td>
            <td>{{ game.AST }}</td>
            <td>{{ game.STL }}</td>
            <td>{{ game.BLK }}</td>
            <td>{{ game.TOV }}</td>
          </template>

          <td>{{ game.FG_PCT }}</td>
          <td>{{ game.FG3_PCT }}</td>
          <td>{{ game.FT_PCT }}</td>

        </tr>
        </tbody>

      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useTeamGameTable } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamGameTable'

const props = defineProps<{
  teamId: number
  season: string
}>()

const {
  filter,
  filteredGames,
  hideScoresModel
} = useTeamGameTable(props.teamId, props.season)
</script>