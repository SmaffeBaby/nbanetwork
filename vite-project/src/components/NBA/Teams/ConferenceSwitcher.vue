<template>
  <div class="flex flex-col md:flex-row justify-center items-center gap-6">
    <button
        @click="props.setConference('All')"
        :class="[
        'transition transform hover:scale-110',
        props.activeConference === 'All'
          ? 'opacity-100 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]'
          : 'opacity-50 hover:opacity-80'
      ]"
    >
      <img src="/logos/ALL_TEAMS.svg" alt="All Teams" class="w-24 md:w-28" />
    </button>

    <button
        @click="props.setConference('East')"
        :class="[
        'transition transform hover:scale-110',
        props.activeConference === 'East'
          ? 'opacity-100'
          : 'opacity-50 hover:opacity-80'
      ]"
    >
      <img src="/logos/EASTERN_V2.svg" alt="Eastern Conference" class="w-28 md:w-32" />
    </button>

    <button
        @click="props.setConference('West')"
        :class="[
        'transition transform hover:scale-110',
        props.activeConference === 'West'
          ? 'opacity-100'
          : 'opacity-50 hover:opacity-80'
      ]"
    >
      <img src="/logos/WESTERN_V2.svg" alt="Western Conference" class="w-28 md:w-32" />
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  activeConference: 'East' | 'West' | 'All'
  setConference: (conf: 'East' | 'West' | 'All') => void
}

const props = defineProps<Props>()
</script>