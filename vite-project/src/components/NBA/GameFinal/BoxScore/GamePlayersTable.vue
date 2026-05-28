<template>
  <div class="max-h-[70vh] overflow-auto rounded-xl border border-gray-200 bg-white">
    <table class="min-w-[980px] border-separate border-spacing-0 text-left text-sm sm:w-full sm:min-w-0 sm:border-collapse">

      <thead class="sticky top-0 z-20 bg-gray-100 text-xs uppercase text-gray-600 shadow-sm">
      <tr>

        <th class="sticky left-0 z-30 w-[190px] bg-gray-100 px-3 py-3 sm:static sm:w-auto">Player</th>

        <th @click="setSort('position')" class="cursor-pointer px-2 py-3">
          POS {{ sortArrow('position') }}
        </th>

        <th @click="setSort('jerseyNum')" class="cursor-pointer px-2 py-3">
          # {{ sortArrow('jerseyNum') }}
        </th>

        <th @click="setSort('minutes')" class="cursor-pointer px-2 py-3">
          MIN {{ sortArrow('minutes') }}
        </th>

        <th @click="setSort('points')" class="cursor-pointer px-2 py-3">
          PTS {{ sortArrow('points') }}
        </th>

        <th @click="setSort('assists')" class="cursor-pointer px-2 py-3">
          AST {{ sortArrow('assists') }}
        </th>

        <th @click="setSort('rebounds')" class="cursor-pointer px-2 py-3">
          REB {{ sortArrow('rebounds') }}
        </th>

        <th @click="setSort('steals')" class="cursor-pointer px-2 py-3">
          STL {{ sortArrow('steals') }}
        </th>

        <th @click="setSort('blocks')" class="cursor-pointer px-2 py-3">
          BLK {{ sortArrow('blocks') }}
        </th>

        <th class="px-2 py-3">FG</th>

        <th @click="setSort('fgPct')" class="cursor-pointer px-2 py-3">
          FG% {{ sortArrow('fgPct') }}
        </th>

        <th class="px-2 py-3">3P</th>

        <th @click="setSort('tpPct')" class="cursor-pointer px-2 py-3">
          3P% {{ sortArrow('tpPct') }}
        </th>

        <th class="px-2 py-3">
          FT
        </th>

        <th @click="setSort('ftPct')" class="cursor-pointer px-2 py-3">
          FT {{ sortArrow('ftPct') }}
        </th>

        <th @click="setSort('fouls')" class="cursor-pointer px-2 py-3">
          FOULS {{ sortArrow('fouls') }}
        </th>

        <th @click="setSort('turnovers')" class="cursor-pointer px-2 py-3">
          TO {{ sortArrow('turnovers') }}
        </th>

        <th class="px-2 py-3">+/-</th>

      </tr>
      </thead>

      <tbody>
      <tr
          v-for="p in players"
          :key="p.PLAYER_ID"
          class="group border-t hover:bg-gray-50"
      >

        <td class="sticky left-0 z-10 w-[190px] bg-white px-3 py-2 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.7)] group-hover:bg-gray-50 sm:static sm:w-auto sm:shadow-none">
          <router-link
              :to="{
                name: 'PlayerPage',
                params: { name: encodeURIComponent(p.name) }
              }"
              class="group/player flex min-w-0 items-center gap-2 hover:underline"
          >
            <img
                :src="getPlayerImage(p)"
                :data-player-id="p.PLAYER_ID"
                @error="handleImageError"
                class="h-8 w-8 shrink-0 rounded-full bg-gray-200 object-cover"
            />
            <span class="min-w-0 truncate font-medium text-gray-700 no-underline hover:text-gray-700">{{ p.name }}</span>
          </router-link>
        </td>

        <td class="px-2 py-2">{{ p.position }}</td>
        <td class="px-2 py-2">{{ p.jerseyNum }}</td>

        <td class="px-2 py-2">{{ p.minutes }}</td>

        <td class="px-2 py-2" :class="statGold(p.points)">{{ p.points }}</td>
        <td class="px-2 py-2" :class="statGold(p.assists)">{{ p.assists }}</td>
        <td class="px-2 py-2" :class="statGold(p.rebounds)">{{ p.rebounds }}</td>

        <td class="px-2 py-2">{{ p.steals }}</td>
        <td class="px-2 py-2">{{ p.blocks }}</td>

        <td class="px-2 py-2">{{ p.fgM }}/{{ p.fgA }}</td>
        <td class="px-2 py-2" :class="fgClass(p)">{{ p.fgPct }}%</td>

        <td class="px-2 py-2">{{ p.tpM }}/{{ p.tpA }}</td>
        <td class="px-2 py-2" :class="tpClass(p)">{{ p.tpPct }}%</td>

        <td class="px-2 py-2">{{ p.ftM }}/{{ p.ftA }}</td>
        <td class="px-2 py-2" :class="ftClass(p)">{{ p.ftPct }}%</td>

        <td class="px-2 py-2">{{ p.fouls }}</td>
        <td class="px-2 py-2">{{ p.turnovers }}</td>

        <td class="px-2 py-2" :class="p.plusMinus >= 0 ? 'text-green-600' : 'text-red-500'">
          {{ p.plusMinus }}
        </td>

      </tr>
      </tbody>

    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  players: any[]

  sortKey: string
  sortDir: string

  setSort: (key: string) => void
  sortArrow: (key: string) => string

  getPlayerImage: (p: any) => string
  handleImageError: (e: Event) => void

  fgClass: (p: any) => string
  tpClass: (p: any) => string
  ftClass: (p: any) => string
  statGold: (v: number) => string
}>()
</script>
