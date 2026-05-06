<template>
  <div class="space-y-4">

    <div class="text-sm text-gray-500">
      Предстоящих игр: {{ games.length }}
    </div>

    <div v-if="error" class="text-sm text-red-500">
      {{ error }}
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
        <tr v-if="loading">
          <td colspan="3" class="px-3 py-10">
            <div
                role="status"
                class="flex items-center justify-center"
            >
              <svg
                  aria-hidden="true"
                  class="inline w-10 h-10 text-gray-200 animate-spin fill-blue-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2167 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
              <span class="sr-only">Загрузка матчей...</span>
            </div>
          </td>
        </tr>

        <tr
            v-else
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

const { games, loading, error, parseMatchup } = useTeamUpcomingGames(props.teamId)
</script>