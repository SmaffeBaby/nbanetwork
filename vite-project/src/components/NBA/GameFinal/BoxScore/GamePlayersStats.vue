<template>
  <div class="space-y-4">

    <GamePlayersFilters
        v-model="filters"
        :has-overtime="hasOvertime"
    />

    <GameTeamsTabs
        :teams="teams"
        v-model:activeTeam="activeTeam"
    />

    <GamePlayersTable
        :players="filtered"
        :sortKey="sortKey"
        :sortDir="sortDir"
        :setSort="setSort"
        :sortArrow="sortArrow"
        :getPlayerImage="getPlayerImage"
        :handleImageError="handleImageError"
        :fgClass="fgClass"
        :tpClass="tpClass"
        :ftClass="ftClass"
        :statGold="statGold"
    />

    <PlayerExcelStats
        :players="players"
        :recap="recap"
        :getPlayerImage="getPlayerImage"
        :handleImageError="handleImageError"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameFinal } from '../../../../composables/NBA/GameFinal/useGameFinal.ts'
import { useGamePlayersStats } from '../../../../composables/NBA/GameFinal/BoxScore/useGamePlayersStats.ts'
import { useGamePlayersTable } from '../../../../composables/NBA/GameFinal/BoxScore/useGamePlayersTable.ts'

import { getPlayerImage, handleImageError } from '../../../../utils/playerImage.ts'
import { fgClass, tpClass, ftClass, statGold } from '../../../../utils/nbaStatColors.ts'

import GamePlayersFilters from './GamePlayersFilters.vue'
import GameTeamsTabs from './GameTeamsTabs.vue'
import GamePlayersTable from './GamePlayersTable.vue'
import PlayerExcelStats from './PlayerExcelStats.vue'

const filters = ref({
  search: '',
  period: null as string | number | null
})

const { recap } = useGameFinal(filters)
const { players } = useGamePlayersStats(recap)

const hasKnownOvertime = ref(false)
const hasRealOvertime = (quarters: string[] = []) =>
    quarters.slice(4).some((quarter) => {
      const score = String(quarter || '').match(/(-?\d+)\s*-\s*(-?\d+)/)
      return Boolean(score && (Number(score[1]) !== 0 || Number(score[2]) !== 0))
    })
const hasOvertime = computed(() => hasKnownOvertime.value || hasRealOvertime(recap.value?.meta?.quarters || []))

watch(
    () => recap.value?.meta?.quarters,
    (quarters) => {
      if (hasRealOvertime(quarters || [])) {
        hasKnownOvertime.value = true
      }
    },
    { immediate: true }
)

const {
  sortKey,
  sortDir,
  activeTeam,
  teams,
  filtered,
  setSort,
  sortArrow
} = useGamePlayersTable(players, recap, filters)
</script>
