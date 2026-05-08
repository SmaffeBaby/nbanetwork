<template>
  <section class="grid gap-4 md:grid-cols-2">
    <PublicProfileProgressCard
        title="Прогресс просмотров"
        :count="watchedCount"
        :rule="watchedRule"
        :level="watchedLevel"
        color="#7c3aed"
    />

    <PublicProfileProgressCard
        title="Прогресс команды"
        :count="topTeamCount"
        :rule="teamRule"
        :level="teamLevel"
        :color="topTeamColor"
        :team-abbr="topTeamAbbr"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { teamStyles } from '../../../constants/TeamColorsAndBackground'
import type {
  ProfileProgressCategory,
  ProfileProgressRule
} from '../../../composables/NBA/PublicProfile/useProfileProgressRules'
import PublicProfileProgressCard from './PublicProfileProgressCard.vue'

const props = defineProps<{
  watchedCount: number
  topTeamCount: number
  topTeamAbbr?: string
  rules: ProfileProgressRule[]
}>()

const findProgressRule = (category: ProfileProgressCategory, count: number) => {
  const categoryRules = props.rules
      .filter(rule => rule.category === category)
      .sort((a, b) => a.max_games - b.max_games)

  return categoryRules.find(rule => count <= rule.max_games) ?? categoryRules.at(-1) ?? null
}

const getLevel = (category: ProfileProgressCategory, count: number) => {
  const passedRules = props.rules
      .filter(rule => rule.category === category)
      .filter(rule => count >= rule.max_games)

  return passedRules.length + 1
}

const watchedRule = computed(() =>
  findProgressRule('watched_games', props.watchedCount)
)

const teamRule = computed(() =>
  findProgressRule('top_team', props.topTeamCount)
)

const watchedLevel = computed(() =>
  getLevel('watched_games', props.watchedCount)
)

const teamLevel = computed(() =>
  getLevel('top_team', props.topTeamCount)
)

const topTeamColor = computed(() =>
  props.topTeamAbbr ? teamStyles[props.topTeamAbbr]?.bgColorHex ?? '#7c3aed' : '#7c3aed'
)
</script>
