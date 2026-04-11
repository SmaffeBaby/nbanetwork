<template>
  <div class="space-y-4">

    <div class="text-sm text-gray-500">
      Предстоящих игр: {{ games.length }}
    </div>

    <div class="overflow-x-auto border rounded-xl">
      <table class="min-w-[600px] w-full text-sm">

        <thead class="bg-gray-100 text-gray-600 text-xs uppercase">
        <tr>
          <th class="p-2">Дата</th>
          <th>Матч</th>
          <th>Время</th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="game in games"
            :key="game.GAME_ID"
            class="border-t hover:bg-gray-50 transition"
        >
          <td class="px-3 py-2 whitespace-nowrap">
            {{ game.FORMATTED_DATE }}
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

          <td class="px-3 py-2">
            {{ game.MOSCOW_TIME }}
          </td>
        </tr>
        </tbody>

      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { getTeamLogo } from '../../../../utils/getTeamLogo'
import { useTeamUpcomingGames } from '../../../../composables/NBA/Teams/TeamsDetail/useTeamUpcomingGames'

const props = defineProps<{
  teamId: number
}>()

const { games, parseMatchup } = useTeamUpcomingGames(props.teamId)
</script>