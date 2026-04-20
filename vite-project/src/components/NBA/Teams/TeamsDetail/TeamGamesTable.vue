<template>
  <div class="space-y-4">

    <div class="flex items-center gap-4">

      <select v-model="filter" class="px-3 py-2 rounded-lg border text-sm">
        <option value="ALL">Все игры</option>
        <option value="W">Победы</option>
        <option value="L">Поражения</option>
      </select>

      <div class="text-sm text-gray-500">
        Всего: {{ sortedGames.length }}
      </div>

      <label class="flex items-center cursor-pointer ml-auto">
        <input type="checkbox" class="sr-only" v-model="hideScoresModel" />

        <div
            class="w-12 h-6 flex items-center rounded-full p-1 transition"
            :class="hideScoresModel ? 'bg-gray-300' : 'bg-blue-500'"
        >
          <div
              class="bg-white w-4 h-4 rounded-full shadow-md transform transition"
              :class="hideScoresModel ? '' : 'translate-x-6'"
          />
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
          <th class="p-3 text-left">Матч</th>
          <th class="p-3 text-left">Дата</th>

          <th v-if="!hideScoresModel" class="p-3">W/L</th>
          <th v-if="!hideScoresModel" class="p-3">PTS</th>
          <th v-if="!hideScoresModel" class="p-3">REB</th>
          <th v-if="!hideScoresModel" class="p-3">AST</th>
          <th v-if="!hideScoresModel" class="p-3">STL</th>
          <th v-if="!hideScoresModel" class="p-3">BLK</th>
          <th v-if="!hideScoresModel" class="p-3">TOV</th>
          <th v-if="!hideScoresModel" class="p-3">FG%</th>
          <th v-if="!hideScoresModel" class="p-3">3P%</th>
          <th v-if="!hideScoresModel" class="p-3">FT%</th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="game in sortedGames"
            :key="game.Game_ID"
            @click="goToGame(game.Game_ID)"
            class="border-t hover:bg-gray-50 transition cursor-pointer"
        >

          <td class="px-4 py-3">
            <div class="flex items-center gap-3">

              <img
                  :src="getTeamLogo(parseMatchup(game.MATCHUP).away)"
                  class="w-7 h-7"
              />

              <div class="flex flex-col leading-tight">

                  <span class="font-medium text-gray-900">
                    {{ parseMatchup(game.MATCHUP).away }}
                    <span class="text-gray-400 mx-1">
                      {{ parseMatchup(game.MATCHUP).isAway ? '@' : 'vs' }}
                    </span>
                    {{ parseMatchup(game.MATCHUP).home }}
                  </span>

                <span class="text-xs text-gray-400">
                    {{ game.SEASON_TYPE === 'Playoffs'
                    ? game.PLAYOFF_ROUND || 'Playoffs'
                    : 'Regular Season'
                  }}
                  </span>

              </div>

              <img
                  :src="getTeamLogo(parseMatchup(game.MATCHUP).home)"
                  class="w-7 h-7"
              />

            </div>
          </td>

          <td class="px-4 py-3 whitespace-nowrap text-gray-600 text-left">
            <span class="text-sm">
              {{ game.GAME_DATE }}
            </span>
          </td>

          <template v-if="!hideScoresModel">

            <td class="text-center">
                <span
                    :class="game.WL === 'W'
                    ? 'text-green-600 font-bold'
                    : 'text-red-500 font-bold'"
                >
                  {{ game.WL }}
                </span>
            </td>

            <td class="text-center">{{ game.PTS }}</td>
            <td class="text-center">{{ game.REB }}</td>
            <td class="text-center">{{ game.AST }}</td>
            <td class="text-center">{{ game.STL }}</td>
            <td class="text-center">{{ game.BLK }}</td>
            <td class="text-center">{{ game.TOV }}</td>
            <td class="text-center">{{ game.FG_PCT }}</td>
            <td class="text-center">{{ game.FG3_PCT }}</td>
            <td class="text-center">{{ game.FT_PCT }}</td>

          </template>

        </tr>
        </tbody>

      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useTeamGameTable } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamGameTable'
import { getTeamLogo } from '../../../../utils/getTeamLogo'

const router = useRouter()

const props = defineProps<{
  teamId: number
  season: string
}>()

const {
  filter,
  sortedGames,
  hideScoresModel,
  parseMatchup,
  setSort,
  getSortIcon
} = useTeamGameTable(props.teamId, props.season)

const goToGame = (gameId: string | number) => {
  if (!gameId) return
  router.push(`/game/${gameId}`)
}
</script>