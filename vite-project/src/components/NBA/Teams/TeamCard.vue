<template>
  <div
      class="relative overflow-hidden rounded-2xl shadow-xl group transition-all duration-500 ease-out hover:scale-[1.04] hover:shadow-2xl"
      :style="{ backgroundColor: props.getTeamStyle(props.team).bgColorHex }"
  >
    <img
        v-if="props.getTeamStyle(props.team).bgSvg"
        :src="props.getTeamStyle(props.team).bgSvg"
        class="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20 transition duration-500"
    />

    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-700">
      <div
          class="absolute -inset-[150%] bg-white/20 rotate-12 blur-2xl transform translate-x-[-120%] group-hover:translate-x-[120%] transition duration-1000"
      ></div>
    </div>

    <div class="absolute -bottom-24 -left-10 w-72 h-72 bg-black/40 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition"></div>

    <div class="relative z-10 p-8 flex flex-col items-center">
      <img
          :src="props.getLogo(props.team)"
          :alt="props.getFullName(props.team)"
          class="w-52 h-52 mb-4 drop-shadow-2xl transition duration-500 group-hover:scale-125 group-hover:-translate-y-3 group-hover:rotate-2"
      />
      <h3 class="text-xl font-bold text-white text-center leading-tight">
        {{ props.getFullName(props.team) }}
      </h3>
      <span
          class="mt-4 px-5 py-2 bg-white/90 backdrop-blur text-black rounded-full font-bold text-sm shadow-lg transition group-hover:scale-110"
      >
        {{ props.getRecord(props.team) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  team: any
  getLogo: (team: any) => string
  getFullName: (team: any) => string
  getRecord: (team: any) => string
  getTeamStyle: (team: any) => { bgColorHex: string; bgSvg?: string }
}

const props = defineProps<Props>()
</script>