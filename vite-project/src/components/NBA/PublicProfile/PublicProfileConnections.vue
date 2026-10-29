<template>
  <div class="mt-4">
    <div class="flex justify-center gap-6 md:justify-start">
      <button v-for="item in kinds" :key="item.key" type="button" class="group rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :aria-label="`Открыть ${item.label.toLowerCase()}`" @click="show(item.key)">
        <strong class="block text-xl font-black text-slate-900 group-hover:text-blue-600">{{ counts.data.value ? number(counts.data.value[item.key]) : counts.isError.value ? '—' : '…' }}</strong>
        <span class="text-xs font-medium text-slate-500 group-hover:text-blue-600">{{ item.label }}</span>
      </button>
    </div>
    <p v-if="counts.isError.value" class="mt-2 text-xs text-rose-600">Не удалось загрузить счётчики. <button class="underline" @click="counts.refetch()">Повторить</button></p>
  </div>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" @click.self="open = false" @keydown.esc.stop="open = false">
      <section ref="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" class="flex max-h-[85svh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white text-left shadow-2xl focus:outline-none">
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">Сообщество</p><h2 :id="titleId" class="mt-1 text-xl font-black text-slate-900">{{ kind === 'following' ? 'Подписки' : 'Подписчики' }}</h2></div><button type="button" aria-label="Закрыть список пользователей" class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-600 hover:bg-slate-200" @click="open = false">×</button></header>
        <div class="grid grid-cols-2 gap-1 border-b border-slate-100 px-5 pt-2" role="tablist" aria-label="Связи профиля">
          <button v-for="item in kinds" :id="`${titleId}-${item.key}`" :key="item.key" type="button" role="tab" :aria-selected="kind === item.key" :tabindex="kind === item.key ? 0 : -1" :aria-controls="panelId" class="border-b-2 px-3 py-3 text-sm font-bold" :class="kind === item.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'" @click="kind = item.key" @keydown.right.prevent="moveKind" @keydown.left.prevent="moveKind">{{ item.label }}</button>
        </div>
        <div :id="panelId" role="tabpanel" :aria-labelledby="`${titleId}-${kind}`" class="min-h-48 overflow-y-auto px-5 py-3" :aria-busy="list.isFetching.value">
          <p v-if="list.isPending.value" role="status" class="py-12 text-center text-sm text-slate-500">Загружаем пользователей…</p>
          <p v-else-if="list.isError.value" role="alert" class="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Не удалось загрузить список. <button class="font-bold underline" @click="list.refetch()">Повторить</button></p>
          <template v-else>
            <p v-if="!list.data.value?.profiles.length" class="py-12 text-center text-sm text-slate-500">{{ kind === 'following' ? 'Здесь пока нет подписок.' : 'Здесь пока нет подписчиков.' }}</p>
            <ul v-else class="divide-y divide-slate-100">
              <li v-for="person in list.data.value?.profiles ?? []" :key="person.id" class="flex items-center gap-3 py-3">
                <RouterLink :to="{ name: 'PublicProfile', params: { id: person.id } }" class="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500" @click="open = false">
                  <img v-if="person.avatar_img" :src="person.avatar_img" alt="" class="h-11 w-11 shrink-0 rounded-full object-cover" />
                  <span v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700">{{ initials(person) }}</span>
                  <span class="min-w-0"><strong class="block truncate text-sm text-slate-900">{{ name(person) }}</strong><span class="text-xs text-slate-400">Открыть профиль</span></span>
                </RouterLink>
                <span v-if="person.id === auth.user?.id" class="text-xs text-slate-400">Это вы</span>
                <button v-else-if="auth.user" type="button" class="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50" :class="following(person.id) ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'" :disabled="pending.includes(person.id)" :aria-label="`${following(person.id) ? 'Отписаться от' : 'Подписаться на'} ${name(person)}`" @click="setFollowing(person.id, !following(person.id))">{{ pending.includes(person.id) ? '…' : following(person.id) ? 'Вы подписаны' : 'Подписаться' }}</button>
              </li>
            </ul>
          </template>
          <p v-if="followError" role="alert" class="mt-2 text-xs text-rose-600">{{ followError }}</p>
        </div>
        <footer v-if="(list.data.value?.total ?? 0) > 20" class="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><button class="rounded-lg border px-3 py-2 disabled:opacity-40" :disabled="page === 0 || list.isFetching.value" @click="page--">Назад</button><span>{{ page + 1 }} / {{ Math.ceil((list.data.value?.total ?? 0) / 20) }}</span><button class="rounded-lg border px-3 py-2 disabled:opacity-40" :disabled="(page + 1) * 20 >= (list.data.value?.total ?? 0) || list.isFetching.value" @click="page++">Далее</button></footer>
      </section>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { RouterLink } from 'vue-router'
import { authFetch } from '../../../api/authFetch'
import { useAuthStore } from '../../../stores/auth'
import { useProfileFollows, type SubscriptionProfile } from '../../../composables/Profile/useProfileFollows'
const props = defineProps<{ profileId: string }>()
type Kind = 'following' | 'followers'
const kinds: { key: Kind; label: string }[] = [{ key: 'following', label: 'Подписки' }, { key: 'followers', label: 'Подписчики' }]
const auth = useAuthStore(), client = useQueryClient()
const { pending, error: followError, setFollowing } = useProfileFollows()
const open = ref(false), kind = ref<Kind>('following'), page = ref(0), dialog = ref<HTMLElement | null>(null)
const titleId = useId(), panelId = useId()
const baseKey = computed(() => ['profile-connections', props.profileId, auth.user?.id ?? ''])
const counts = useQuery({
  queryKey: computed(() => [...baseKey.value, 'counts']), enabled: computed(() => Boolean(props.profileId && auth.user && !auth.loading)),
  queryFn: ({ signal }): Promise<Record<Kind, number>> => authFetch(`/api/profiles/${props.profileId}/connections`, { signal }), staleTime: 15000, refetchInterval: 60000
})
const list = useQuery({
  queryKey: computed(() => [...baseKey.value, kind.value, page.value]), enabled: computed(() => open.value && Boolean(auth.user)),
  queryFn: ({ queryKey, signal }): Promise<{ profiles: SubscriptionProfile[]; total: number }> => authFetch(`/api/profiles/${queryKey[1]}/connections?kind=${queryKey[3]}&offset=${Number(queryKey[4]) * 20}`, { signal }), staleTime: 10000
})
const following = (id: string) => auth.user?.followingProfiles.includes(id) ?? false
const name = (p: SubscriptionProfile) => `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Пользователь'
const initials = (p: SubscriptionProfile) => `${p.first_name?.trim()[0] || ''}${p.last_name?.trim()[0] || ''}` || 'U'
const number = (n: number) => n.toLocaleString('ru-RU')
function show(value: Kind) { kind.value = value; page.value = 0; open.value = true }
async function moveKind() { kind.value = kind.value === 'following' ? 'followers' : 'following'; await nextTick(); document.getElementById(`${titleId}-${kind.value}`)?.focus() }
watch(kind, () => { page.value = 0 })
watch(() => props.profileId, () => { open.value = false; page.value = 0 })
watch(() => list.data.value?.total, total => { if (total !== undefined) page.value = Math.min(page.value, Math.max(0, Math.ceil(total / 20) - 1)) })
watch(() => auth.followingRevision, () => {
  if (!auth.followingPending.length) void client.invalidateQueries({ queryKey: ['profile-connections'] })
})
let previousFocus: HTMLElement | null = null, previousOverflow = ''
function trap(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value) return
  const items = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]),a[href]')], first = items[0], last = items.at(-1)
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function restore() { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', trap); previousFocus?.focus() }
watch(open, async value => {
  if (!value) { restore(); return }
  previousFocus = document.activeElement as HTMLElement; previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', trap); await nextTick(); dialog.value?.focus(); void counts.refetch(); void list.refetch()
})
onUnmounted(() => { if (open.value) restore() })
</script>
