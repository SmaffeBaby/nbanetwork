<template>
  <div class="overflow-auto border rounded-xl max-h-[70vh]">
    <table class="w-full text-sm">

      <thead class="sticky top-0 bg-gray-100 z-10 text-xs uppercase">
      <tr>

        <th>Player</th>

        <th @click="setSort('position')" class="cursor-pointer">
          POS {{ sortArrow('position') }}
        </th>

        <th @click="setSort('jerseyNum')" class="cursor-pointer">
          # {{ sortArrow('jerseyNum') }}
        </th>

        <th @click="setSort('minutes')" class="cursor-pointer">
          MIN {{ sortArrow('minutes') }}
        </th>

        <th @click="setSort('points')" class="cursor-pointer">
          PTS {{ sortArrow('points') }}
        </th>

        <th @click="setSort('assists')" class="cursor-pointer">
          AST {{ sortArrow('assists') }}
        </th>

        <th @click="setSort('rebounds')" class="cursor-pointer">
          REB {{ sortArrow('rebounds') }}
        </th>

        <th @click="setSort('steals')" class="cursor-pointer">
          STL {{ sortArrow('steals') }}
        </th>

        <th @click="setSort('blocks')" class="cursor-pointer">
          BLK {{ sortArrow('blocks') }}
        </th>

        <th>FG</th>

        <th @click="setSort('fgPct')" class="cursor-pointer">
          FG% {{ sortArrow('fgPct') }}
        </th>

        <th>3P</th>

        <th @click="setSort('tpPct')" class="cursor-pointer">
          3P% {{ sortArrow('tpPct') }}
        </th>

        <th>
          FT
        </th>

        <th @click="setSort('ftPct')" class="cursor-pointer">
          FT {{ sortArrow('ftPct') }}
        </th>

        <th @click="setSort('fouls')" class="cursor-pointer">
          FOULS {{ sortArrow('fouls') }}
        </th>

        <th @click="setSort('turnovers')" class="cursor-pointer">
          TO {{ sortArrow('turnovers') }}
        </th>

        <th>+/-</th>

      </tr>
      </thead>

      <tbody>
      <tr
          v-for="p in players"
          :key="p.PLAYER_ID"
          class="border-t hover:bg-gray-50"
      >

        <td class="px-2 py-2 flex items-center gap-2">
          <img
              :src="getPlayerImage(p)"
              :data-player-id="p.PLAYER_ID"
              @error="handleImageError"
              class="w-8 h-8 rounded-full bg-gray-200 object-cover"
          />
          <span class="font-medium">{{ p.name }}</span>
        </td>

        <td>{{ p.position }}</td>
        <td>{{ p.jerseyNum }}</td>

        <td>{{ p.minutes }}</td>

        <td :class="statGold(p.points)">{{ p.points }}</td>
        <td :class="statGold(p.assists)">{{ p.assists }}</td>
        <td :class="statGold(p.rebounds)">{{ p.rebounds }}</td>

        <td>{{ p.steals }}</td>
        <td>{{ p.blocks }}</td>

        <td>{{ p.fgM }}/{{ p.fgA }}</td>
        <td :class="fgClass(p)">{{ p.fgPct }}%</td>

        <td>{{ p.tpM }}/{{ p.tpA }}</td>
        <td :class="tpClass(p)">{{ p.tpPct }}%</td>

        <td>{{ p.ftM }}/{{ p.ftA }}</td>
        <td :class="ftClass(p)">{{ p.ftPct }}%</td>

        <td>{{ p.fouls }}</td>
        <td>{{ p.turnovers }}</td>

        <td :class="p.plusMinus >= 0 ? 'text-green-600' : 'text-red-500'">
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