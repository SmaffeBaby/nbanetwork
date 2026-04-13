<template>
  <div
      v-if="recap"
      class="p-5 rounded-2xl shadow-lg bg-gradient-to-br from-gray-900 to-gray-800 text-white space-y-5"
  >

    <div class="flex justify-between items-center">


      <span class="text-xs bg-white/10 px-3 py-1 rounded-full">
        {{ recap.insight || '—' }}
      </span>
    </div>

    <div class="space-y-2">
      <p
          v-for="(line, i) in recap.storyline || []"
          :key="i"
          class="text-sm text-gray-200 leading-relaxed"
      >
        {{ line }}
      </p>
    </div>

    <div
        v-if="recap.mvp"
        class="bg-gradient-to-r from-yellow-500/20 to-yellow-300/10 p-4 rounded-xl border border-yellow-400/20"
    >
      <div class="text-xs uppercase text-yellow-300">🏆 MVP</div>

      <div class="text-lg font-semibold">
        {{ recap.mvp.name || '—' }}
      </div>

      <div class="text-sm text-gray-300">
        {{ recap.mvp.stats || '' }}
      </div>
    </div>

    <div
        v-if="recap.runs"
        class="bg-red-500/10 text-red-300 p-3 rounded-xl text-sm font-semibold"
    >
      {{ recap.runs }}
    </div>

    <div
        v-if="recap.clutch"
        class="bg-white/5 p-4 rounded-xl"
    >
      <div class="text-xs text-gray-400 mb-1">🔥 Clutch</div>
      <div class="text-sm">{{ recap.clutch }}</div>
    </div>

    <div class="flex flex-wrap gap-2">
      <div
          v-for="(q, i) in (recap.quarters || [])"
          :key="i"
          class="text-xs bg-white/10 px-3 py-1 rounded-lg"
      >
        {{ q }}
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
defineProps<{
  recap: any
}>()
</script>