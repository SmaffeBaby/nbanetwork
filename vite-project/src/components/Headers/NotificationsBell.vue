<template>
  <div v-if="user" ref="root" class="relative">
    <button ref="bell" type="button" title="Уведомления" aria-label="Уведомления" :aria-expanded="open" :aria-controls="id" class="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95" @click="toggleOpen"><BellIcon class="h-6 w-6" /><span v-if="unreadCount" class="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{{ unreadCount>99?'99+':unreadCount }}</span></button>
    <section v-if="open" :id="id" role="region" aria-label="Центр уведомлений" class="absolute right-0 z-[100] mt-3 flex max-h-[min(70svh,650px)] w-96 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-20 max-sm:mt-0 max-sm:max-h-[calc(100svh-6rem)] max-sm:w-auto max-sm:max-w-none">
      <header class="border-b border-slate-100 p-4"><div class="flex items-center justify-between gap-2"><div><h2 class="text-base font-black text-slate-900">Уведомления</h2><p class="mt-1 text-xs text-slate-500">Активность, фентези и матчи</p></div><div class="flex gap-1"><button type="button" title="Настройки уведомлений" aria-label="Настройки уведомлений" class="rounded-xl p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600" @click="openSettings"><Cog6ToothIcon class="h-5 w-5" /></button><button type="button" aria-label="Закрыть уведомления" class="rounded-xl px-2 text-xl text-slate-400 hover:bg-slate-50" @click="open=false">×</button></div></div><div v-if="notifications.length||unreadCount" class="mt-3 flex justify-between gap-2 text-xs font-bold"><button v-if="unreadCount" :disabled="busy" class="text-blue-600 disabled:opacity-40" @click="markAll">Прочитать все</button><button v-if="notifications.length" :disabled="busy" class="ml-auto text-slate-500 disabled:opacity-40" @click="clear">Очистить ленту</button></div></header>
      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        <p v-if="loading" role="status" class="p-6 text-center text-sm text-slate-500">Загружаем уведомления…</p>
        <p v-if="error||actionError" role="alert" class="m-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{{ actionError||error?.message }} <button class="font-bold underline" @click="retry">Повторить</button></p>
        <RouterLink v-for="notification in notifications" :key="notification.id" :to="notification.to" class="flex min-w-0 gap-3 rounded-xl p-3 transition hover:bg-slate-50" :class="!notification.read_at?'bg-blue-50/40':''" @click="visit(notification.id)"><img v-if="notification.avatarImg" :src="notification.avatarImg" alt="" class="h-10 w-10 shrink-0 rounded-full object-cover" /><span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black" :class="notification.kind.startsWith('fantasy')?'bg-indigo-50 text-indigo-600':notification.kind==='game_result'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'">{{ notification.kind.startsWith('fantasy')?'F':notification.kind==='game_result'?'🏀':notification.title.charAt(0) }}</span><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="truncate text-sm font-bold text-slate-900">{{ notification.title }}</span><span v-if="!notification.read_at" class="h-2 w-2 shrink-0 rounded-full bg-blue-500" /></div><p class="mt-1 break-words text-xs leading-5 text-slate-600">{{ notification.message }}</p><p class="mt-1 text-[10px] text-slate-400">{{ notification.label }} · {{ formatTime(notification.created_at) }}</p></div></RouterLink>
        <p v-if="!loading&&!error&&!notifications.length" class="p-8 text-center text-sm leading-6 text-slate-500">Пока нет уведомлений.<br><button class="mt-2 text-xs font-bold text-blue-600" @click="openSettings">Настроить события</button></p>
        <button v-if="canLoadMore" :disabled="loading" class="w-full rounded-xl p-3 text-xs font-bold text-blue-600" @click="loadMore">Показать ещё</button>
      </div>
    </section>
    <NotificationSettings v-if="settingsOpen" @close="closeSettings" @saved="retry" />
  </div>
</template>
<script setup lang="ts">
import {nextTick,onMounted,onUnmounted,ref,useId} from 'vue'
import {RouterLink} from 'vue-router'
import {BellIcon,Cog6ToothIcon} from '@heroicons/vue/24/outline'
import NotificationSettings from './NotificationSettings.vue'
import {useNotificationsBell} from '../../composables/Headers/useNotificationsBell'
const {user,open,settingsOpen,openSettings,toggleOpen,visit,notifications,unreadCount,loading,error,actionError,busy,retry,clear,markAll,loadMore,canLoadMore}=useNotificationsBell()
const root=ref<HTMLElement|null>(null),bell=ref<HTMLButtonElement|null>(null),id=useId()
const formatTime=(date:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(date))
function closeSettings(){settingsOpen.value=false;void nextTick(()=>bell.value?.focus())}
function outside(e:PointerEvent){if(root.value&&!root.value.contains(e.target as Node))open.value=false}
function escape(e:KeyboardEvent){if(e.key==='Escape')open.value=false}
onMounted(()=>{document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)})
onUnmounted(()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)})
</script>
