<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" @click.self="close" @keydown.esc.stop="close">
      <section ref="dialog" role="dialog" aria-modal="true" :aria-labelledby="id" tabindex="-1" class="flex max-h-[90svh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl focus:outline-none" @keydown="trap">
        <header class="flex items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 :id="id" class="text-lg font-black text-slate-900">Настройки уведомлений</h2><p class="mt-1 text-xs text-slate-500">Настройки сохраняются в аккаунте</p></div><button type="button" aria-label="Закрыть настройки уведомлений" :disabled="saving" class="rounded-full bg-slate-100 px-3 py-1 text-2xl text-slate-500 disabled:opacity-40" @click="close">×</button></header>
        <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <p v-if="loading" role="status" class="py-8 text-center text-sm text-slate-500">Загружаем настройки…</p>
          <p v-if="error" role="alert" class="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{{ error }} <button v-if="!settings" class="font-bold underline" @click="load">Повторить</button></p>
          <fieldset v-if="settings" :disabled="saving" class="space-y-5 disabled:opacity-60">
            <section class="rounded-2xl border border-slate-200 p-4">
              <label class="flex cursor-pointer items-center justify-between gap-4"><span><strong class="block text-sm text-slate-900">Активность пользователей</strong><span class="mt-1 block text-xs leading-5 text-slate-500">События от тех, на кого вы подписаны</span></span><input v-model="settings.activity" type="checkbox" role="switch" aria-label="Активность пользователей" class="h-5 w-5 shrink-0 accent-blue-600" /></label>
              <fieldset :disabled="!settings.activity" class="mt-4 space-y-3 border-t border-slate-100 pt-4 disabled:opacity-45">
                <label v-for="item in activityTypes" :key="item.key" class="flex items-center gap-3 text-sm text-slate-700"><input v-model="settings[item.key]" type="checkbox" class="h-4 w-4 accent-blue-600" />{{ item.label }}</label>
                <div class="space-y-2 pt-2 text-sm text-slate-700"><label class="flex items-center gap-3"><input v-model="settings.actor_mode" value="all" type="radio" name="notification-actors" class="accent-blue-600" />Все мои подписки</label><label class="flex items-center gap-3"><input v-model="settings.actor_mode" value="selected" type="radio" name="notification-actors" class="accent-blue-600" />Только выбранные пользователи</label></div>
                <div v-if="settings.actor_mode==='selected'" class="rounded-xl bg-slate-50 p-3">
                  <input v-model="search" type="search" aria-label="Найти подписку для уведомлений" placeholder="Найти пользователя…" class="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm" />
                  <div class="mt-2 max-h-48 space-y-1 overflow-y-auto"><label v-for="profile in filtered" :key="profile.id" class="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-white"><input v-model="settings.actor_ids" :value="profile.id" type="checkbox" :aria-label="name(profile)" class="h-4 w-4 shrink-0 accent-blue-600" /><img v-if="profile.avatar_img" :src="profile.avatar_img" alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" /><span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500">{{ name(profile).charAt(0) }}</span><span class="truncate text-xs font-semibold text-slate-700">{{ name(profile) }}</span></label></div>
                  <p v-if="!following.length" class="mt-3 text-xs text-slate-500">Пока нет подписок. Подпишитесь на пользователей в их профилях.</p><p v-else-if="!filtered.length" class="mt-3 text-xs text-slate-500">Пользователь не найден</p><p class="mt-2 text-[11px] text-slate-500">Выбрано: {{ settings.actor_ids.length }}. Новые подписки не добавляются автоматически в выбранный список.</p>
                </div>
              </fieldset>
            </section>
            <section class="rounded-2xl border border-slate-200 p-4"><label class="flex cursor-pointer items-center justify-between gap-4"><span><strong class="block text-sm text-slate-900">Фентези</strong><span class="mt-1 block text-xs leading-5 text-slate-500">Подтверждение состава, обработка баллов за матч и итоги игрового дня в обоих режимах</span></span><input v-model="settings.fantasy" type="checkbox" role="switch" aria-label="Фентези" class="h-5 w-5 shrink-0 accent-blue-600" /></label></section>
            <section class="rounded-2xl border border-slate-200 p-4"><label class="flex cursor-pointer items-center justify-between gap-4"><span><strong class="block text-sm text-slate-900">Исходы матчей</strong><span class="mt-1 block text-xs leading-5 text-slate-500">Уведомление после завершения отслеживаемой игры</span></span><input v-model="settings.game_results" type="checkbox" role="switch" aria-label="Исходы матчей" class="h-5 w-5 shrink-0 accent-blue-600" /></label><fieldset :disabled="!settings.game_results" class="mt-4 space-y-3 border-t border-slate-100 pt-4 disabled:opacity-45"><label v-for="item in resultTypes" :key="item.key" class="flex items-center gap-3 text-sm text-slate-700"><input v-model="settings[item.key]" type="checkbox" class="h-4 w-4 accent-blue-600" />{{ item.label }}</label></fieldset></section>
          </fieldset>
          <p class="text-xs leading-5 text-slate-500">Это лента внутри сайта, без браузерных push-уведомлений. События сохраняются, пока сайт закрыт. Настройки влияют на новые события; старые уведомления остаются в истории. Баллы и исходы приходят для матчей, начавшихся после включения категории. При скрытом счёте результат и победитель не показываются.</p>
        </div>
        <footer class="flex justify-end gap-3 border-t border-slate-100 p-4"><button type="button" :disabled="saving" class="rounded-xl px-4 py-3 text-sm font-bold text-slate-500 disabled:opacity-40" @click="close">Отмена</button><button type="button" :disabled="loading||saving||!settings" class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40" @click="save">{{ saving?'Сохраняем…':'Сохранить' }}</button></footer>
      </section>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import {computed,nextTick,onMounted,onUnmounted,ref,useId,watch} from 'vue'
import {authFetch} from '../../api/authFetch'
import {useAuthStore} from '../../stores/auth'
import type {NotificationPreferences} from './notificationTypes'
type Profile={id:string;first_name:string;last_name:string;avatar_img:string|null}
const emit=defineEmits<{close:[];saved:[]}>(),auth=useAuthStore(),owner=auth.user?.id||'',id=useId(),dialog=ref<HTMLElement|null>(null),settings=ref<NotificationPreferences|null>(null),following=ref<Profile[]>([]),loading=ref(true),saving=ref(false),error=ref(''),search=ref('')
const activityTypes: {key:'game_comments'|'articles'|'article_comments';label:string}[]=[{key:'game_comments',label:'Комментарии к матчам'},{key:'articles',label:'Новые статьи'},{key:'article_comments',label:'Комментарии к статьям'}]
const resultTypes:{key:'result_favorites'|'result_teams'|'result_predictions';label:string}[]=[{key:'result_favorites',label:'Избранные матчи'},{key:'result_teams',label:'Матчи любимых команд'},{key:'result_predictions',label:'Матчи с моими прогнозами'}]
const name=(p:Profile)=>[p.first_name,p.last_name].filter(Boolean).join(' ')||'Пользователь'
const filtered=computed(()=>following.value.filter(p=>name(p).toLowerCase().includes(search.value.toLowerCase().trim())))
const controller=new AbortController()
async function load(){loading.value=true;error.value='';try{const data=await authFetch('/api/profile-inbox/settings',{signal:controller.signal,headers:{'X-Profile-Id':owner}});if(auth.user?.id!==owner)return;settings.value=data.settings;following.value=data.following;settings.value!.actor_ids=settings.value!.actor_ids.filter(id=>following.value.some(p=>p.id===id))}catch(e:any){if(!controller.signal.aborted)error.value=e.message}finally{loading.value=false}}
async function save(){if(!settings.value||saving.value||auth.user?.id!==owner)return;saving.value=true;error.value='';try{await authFetch('/api/profile-inbox/settings',{method:'PUT',headers:{'X-Profile-Id':owner},body:JSON.stringify(settings.value),signal:controller.signal});if(auth.user?.id!==owner)return;emit('saved');emit('close')}catch(e:any){if(!controller.signal.aborted)error.value=e.message}finally{saving.value=false}}
function close(){if(!saving.value)emit('close')}
let previousFocus:HTMLElement|null=null,overflow=''
function trap(e:KeyboardEvent){if(e.key!=='Tab'||!dialog.value)return;const items=[...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')].filter(e=>e.getClientRects().length&&!e.matches(':disabled')),first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.value)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
watch(()=>auth.user?.id,value=>{if(value!==owner)emit('close')})
onMounted(async()=>{previousFocus=document.activeElement as HTMLElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden';await nextTick();dialog.value?.focus();void load()})
onUnmounted(()=>{controller.abort();document.body.style.overflow=overflow;previousFocus?.focus()})
</script>
