<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div class="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-slate-50 px-3 py-2">
      <img v-if="!photoFailed" :src="`https://a.espncdn.com/i/headshots/nba/players/full/${player.id}.png`" alt="" loading="lazy" class="h-16 w-16 shrink-0 rounded-lg bg-white object-contain object-bottom" @error="photoFailed = true" />
      <span v-else aria-hidden="true" class="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-blue-700">{{ player.slot }}</span>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-bold text-blue-700">{{ player.slot }} <span class="text-slate-500">· {{ player.team }}<template v-if="player.ovr != null"> · {{ player.ovr }} OVR</template></span></p>
        <h4 class="break-words font-extrabold text-slate-900">{{ player.name }}</h4>
      </div>
      <strong class="shrink-0 text-lg" :class="total < 0 ? 'text-rose-700' : 'text-blue-700'">{{ points(total) }} <small class="text-xs">оч.</small></strong>
    </div>
    <details class="p-3" @toggle="onToggle">
      <summary class="cursor-pointer text-sm font-bold text-slate-700">За что начислены баллы</summary>
      <p v-if="loading" role="status" class="mt-3 text-sm text-slate-500">Загружаем начисления…</p>
      <p v-else-if="error" role="alert" class="mt-3 text-sm text-rose-700">{{ error }} <button type="button" class="font-bold underline" @click="load">Повторить</button></p>
      <FantasyScoreBreakdown v-else-if="score" :score="score" @close="$emit('close')" />
    </details>
  </article>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { authFetch } from '../../api/authFetch'
import FantasyScoreBreakdown from './FantasyScoreBreakdown.vue'
import { points, type FantasyScore, type Mode, type Pick } from './types'

const props = defineProps<{ player: Pick; total: number; period: string; mode: Mode | 'legacy'; profileId: string }>()
defineEmits<{ close: [] }>()
const photoFailed = ref(false)
const loading = ref(false)
const score = ref<FantasyScore | null>(null)
const error = ref('')
const controller = new AbortController()

function onToggle(event: Event) {
  if ((event.currentTarget as HTMLDetailsElement).open && !score.value && !loading.value && !error.value) void load()
}

async function load() {
  loading.value = true
  error.value = ''
  const params = new URLSearchParams({ view: 'score', profile: props.profileId })
  if (props.mode === 'legacy') params.set('week', props.period)
  else {
    params.set('day', props.period)
    params.set('mode', props.mode)
  }
  try {
    score.value = await authFetch(`/api/fantasy/players/${props.player.id}?${params}`, { signal: controller.signal })
  } catch (err) {
    if (!controller.signal.aborted) error.value = err instanceof Error ? err.message : 'Не удалось загрузить начисления.'
  } finally {
    loading.value = false
  }
}

onUnmounted(() => controller.abort())
</script>
