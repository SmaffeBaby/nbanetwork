<template>
  <div class="space-y-4">

    <div class="flex gap-4 items-center">

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
          <th class="p-2 cursor-pointer" @click="setSort('GAME_DATE')">
            Дата {{ getSortIcon('GAME_DATE') }}
          </th>
          <th>Матч</th>

          <th v-if="!hideScoresModel" @click="setSort('WL')" class="cursor-pointer">
            W/L {{ getSortIcon('WL') }}
          </th>

          <th v-if="!hideScoresModel" @click="setSort('PTS')" class="cursor-pointer">PTS {{ getSortIcon('PTS') }}</th>
          <th v-if="!hideScoresModel" @click="setSort('REB')" class="cursor-pointer">REB {{ getSortIcon('REB') }}</th>
          <th v-if="!hideScoresModel" @click="setSort('AST')" class="cursor-pointer">AST {{ getSortIcon('AST') }}</th>
          <th v-if="!hideScoresModel" @click="setSort('STL')" class="cursor-pointer">STL {{ getSortIcon('STL') }}</th>
          <th v-if="!hideScoresModel" @click="setSort('BLK')" class="cursor-pointer">BLK {{ getSortIcon('BLK') }}</th>
          <th v-if="!hideScoresModel" @click="setSort('TOV')" class="cursor-pointer">TOV {{ getSortIcon('TOV') }}</th>

          <th @click="setSort('FG_PCT')" class="cursor-pointer">FG% {{ getSortIcon('FG_PCT') }}</th>
          <th @click="setSort('FG3_PCT')" class="cursor-pointer">3P% {{ getSortIcon('FG3_PCT') }}</th>
          <th @click="setSort('FT_PCT')" class="cursor-pointer">FT% {{ getSortIcon('FT_PCT') }}</th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="game in sortedGames"
            :key="game.Game_ID"
            @click="goToGame(game.Game_ID)"
            class="border-t hover:bg-gray-50 transition cursor-pointer active:scale-[0.99]"
        >

          <td class="px-3 py-2 whitespace-nowrap text-gray-600">
            {{ game.GAME_DATE }}
          </td>

          <td class="px-3 py-2">
            <div class="flex items-center gap-2">
              <img :src="getTeamLogo(parseMatchup(game.MATCHUP).away)" class="w-6 h-6" />
              <span>{{ parseMatchup(game.MATCHUP).away }}</span>

              <span class="text-gray-400 text-xs">
                  {{ parseMatchup(game.MATCHUP).isAway ? '@' : 'vs' }}
                </span>

              <img :src="getTeamLogo(parseMatchup(game.MATCHUP).home)" class="w-6 h-6" />
              <span>{{ parseMatchup(game.MATCHUP).home }}</span>
            </div>
          </td>

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