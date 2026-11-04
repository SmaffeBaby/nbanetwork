<template>
  <Teleport to="body">
    <dialog ref="dialog" :aria-labelledby="titleId" class="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl backdrop:bg-slate-950/60 sm:p-6" @close="$emit('close')" @click.self="dialog?.close()">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-blue-700">{{ overall ? 'Лучший состав за всё время' : archive ? 'Состав за неделю' : 'Состав за день' }}</p>
          <h3 :id="titleId" class="mt-1 text-xl font-black text-slate-900">{{ [leader.first_name, leader.last_name].filter(Boolean).join(' ') || 'Участник' }}</h3>
        </div>
        <button type="button" autofocus aria-label="Закрыть карточку состава" class="rounded-lg bg-slate-100 px-3 py-1 text-xl" @click="dialog?.close()">×</button>
      </div>
      <p v-if="loading" role="status" class="py-6 text-sm text-slate-500">Загружаем состав…</p>
      <p v-else-if="error" role="alert" class="py-6 text-sm text-rose-700">{{ error }} <button class="font-bold underline" @click="load">Повторить</button></p>
      <template v-else-if="entry">
        <p class="mt-4 text-sm text-slate-600">{{ weekLabel(entry.week) }} · <strong>{{ points(entry.points) }} оч.</strong><span v-if="entry.settled === false"> · предварительно</span></p>
        <ul class="my-4 grid items-start gap-3 sm:grid-cols-2">
          <li v-for="player in lineup" :key="player.slot">
            <FantasyLineupPlayer :player="player" :total="Number(entry.player_points?.[player.id] ?? 0)" :period="entry.week" :mode="archive ? 'legacy' : mode" :profile-id="leader.user_id" @close="dialog?.close()" />
          </li>
        </ul>
      </template>
      <p v-else class="py-6 text-sm text-slate-500">Состав недоступен.</p>
      <RouterLink :to="`/profile/${leader.user_id}`" class="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700" @click="dialog?.close()">Перейти в профиль</RouterLink>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId } from 'vue'
import FantasyLineupPlayer from './FantasyLineupPlayer.vue'
import { authFetch } from '../../api/authFetch'
import { points, slots, weekLabel, type Entry, type Leader, type Mode } from './types'

const props = defineProps<{ leader: Leader; day: string; mode: Mode; overall: boolean; archive: boolean }>()
defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()
const entry = ref<Entry | null>(null)
const error = ref('')
const loading = ref(true)
const controller = new AbortController()
const lineup = computed(() => [...(entry.value?.lineup || [])].sort((a,b) => slots.indexOf(a.slot) - slots.indexOf(b.slot)))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { history }: { history: Entry[] } = await authFetch(`/api/fantasy/profiles/${props.leader.user_id}`, { signal: controller.signal })
    const entries = history.filter(e => e.mode === (props.archive ? 'legacy' : props.mode))
    entry.value = props.overall
      ? entries.reduce<Entry | null>((best, item) => !best || Number(item.points) > Number(best.points) ||
          (Number(item.points) === Number(best.points) && item.week > best.week) ? item : best, null)
      : entries.find(e => e.week === props.day) ?? null
  } catch (err) {
    if (!controller.signal.aborted) error.value = err instanceof Error ? err.message : 'Не удалось загрузить состав.'
  } finally {
    loading.value = false
  }
}

onMounted(() => { dialog.value?.showModal(); void load() })
onUnmounted(() => controller.abort())
</script>
