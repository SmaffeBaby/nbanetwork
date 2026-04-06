<template>
  <div class="p-4 md:p-6 text-white">

    <div class="flex justify-center mb-4">
      <img
          src="/logos/REGULAR_SEASON.svg"
          alt="NBA Regular Season"
          class="w-40 md:w-60 object-contain"
      />
    </div>

    <select
        v-model="selectedSeason"
        @change="fetchStandings"
        class="bg-gray-800 border border-gray-600 px-3 py-2 rounded mb-4"
    >
      <option v-for="s in seasons" :key="s" :value="s">
        {{ s }}
      </option>
    </select>

    <div v-if="teams.length === 0" class="text-gray-400">
      Loading...
    </div>

    <div v-for="conf in ['East', 'West']" :key="conf" class="mb-8">
      <h2 class="text-lg md:text-xl font-semibold mb-3 flex justify-center">
        <img
            :src="conf === 'East' ? '/logos/EASTERN.svg' : '/logos/WESTERN.svg'"
            class="w-26 h-26"
        />
      </h2>

      <div class="md:hidden space-y-2">
        <div
            v-for="(team, i) in getTeams(conf)"
            :key="team.TeamID"
            class="bg-gray-800 p-3 rounded flex justify-between items-center"
            :class="rowClass(i)"
        >
          <div class="flex items-center gap-2">
            <img :src="getLogo(team)" class="w-6 h-6" />
            <span class="text-sm font-semibold">
              {{ i + 1 }}. {{ team.TeamCity }} {{ team.TeamName }}
            </span>
            <span class="text-xs ml-1 font-bold">
              {{ getStatus(i) }}
            </span>
          </div>
          <div class="text-sm">
            {{ getField(team, 'WINS', 'W') }}-{{ getField(team, 'LOSSES', 'L') }}
          </div>
        </div>
      </div>

      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead
              :class="conf === 'East'
              ? 'bg-blue-600 text-white'
              : 'bg-red-600 text-white'"
          >
          <tr>
            <th>#</th>
            <th class="text-left px-2">Team</th>
            <th>W</th>
            <th>L</th>
            <th>Win%</th>
            <th>GB</th>
            <th class="hidden lg:table-cell">CONF</th>
            <th class="hidden lg:table-cell">DIV</th>
            <th class="hidden lg:table-cell">HOME</th>
            <th class="hidden lg:table-cell">ROAD</th>
            <th class="hidden xl:table-cell">LAST10</th>
            <th>STRK</th>
            <th>Status</th>
          </tr>
          </thead>

          <tbody class="text-black">
          <tr
              v-for="(team, i) in getTeams(conf)"
              :key="team.TeamID"
              :class="rowClass(i) + ' hover:bg-gray-100'"
          >
            <td class="px-2">{{ i + 1 }}</td>
            <td class="flex items-center gap-2 px-2">
              <img :src="getLogo(team)" class="w-6 h-6" />
              {{ team.TeamCity }} {{ team.TeamName }}
            </td>
            <td>{{ getField(team,'WINS','W') }}</td>
            <td>{{ getField(team,'LOSSES','L') }}</td>
            <td>{{ getField(team,'WinPCT') }}</td>
            <td>{{ getField(team,'ConferenceGamesBack','GamesBehind') }}</td>
            <td class="hidden lg:table-cell">
              {{ getField(team,'ConferenceRecord') }}
            </td>
            <td class="hidden lg:table-cell">
              {{ getField(team,'DivisionRecord') }}
            </td>
            <td class="hidden lg:table-cell">
              {{ getField(team,'HOME') }}
            </td>
            <td class="hidden lg:table-cell">
              {{ getField(team,'ROAD') }}
            </td>
            <td class="hidden xl:table-cell">
              {{ getField(team,'L10','LastTenGames') }}
            </td>
            <td>{{ getField(team,'strCurrentStreak','CurrentStreak') }}</td>
            <td>{{ getStatus(i) }}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStandings } from '../../composables/Standings/useStandings'

const {
  teams,
  selectedSeason,
  seasons,
  getLogo,
  getTeams,
  getField,
  rowClass,
  getStatus,
  fetchStandings,
} = useStandings()
</script>