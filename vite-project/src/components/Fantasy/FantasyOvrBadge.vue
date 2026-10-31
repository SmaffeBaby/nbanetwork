<template>
  <div v-if="rating.ovr !== undefined" v-bind="$attrs" class="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-2.5 py-1 text-white shadow" @click.stop>
    <span class="text-lg font-black" :aria-label="`${rating.ovr} OVR`">{{ rating.ovr }} <small class="text-[9px] text-amber-300">OVR</small></span>
    <button ref="trigger" type="button" :aria-label="`Как формируется рейтинг ${name || 'игрока'}`" aria-haspopup="dialog" :aria-expanded="open" class="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/40 text-sm font-bold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" @click.stop="show">i</button>
  </div>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" @click.self="close" @keydown.esc.stop="close" @click.stop>
      <section ref="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" class="max-h-[90svh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 text-left shadow-2xl focus:outline-none sm:p-7" @keydown="trap">
        <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-widest text-blue-600">Сезонный рейтинг</p><h2 :id="titleId" class="mt-2 text-xl font-black text-slate-900">{{ name || 'Игрок' }} · {{ rating.ovr }} OVR</h2></div><button type="button" aria-label="Закрыть пояснение рейтинга" class="rounded-full bg-slate-100 px-3 py-1 text-2xl text-slate-600 hover:bg-slate-200" @click="close">×</button></div>
        <div class="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>OVR — общая статистическая оценка выступлений игрока в текущем регулярном сезоне НБА. Шкала от 60 до 99: чем выше число, тем сильнее совокупные показатели. Это наш расчёт, а не официальный рейтинг NBA 2K и не гарантия очков в следующем матче.</p>
          <p>Сравниваем игрока с баскетболистами той же роли: защитниками, крыльями или большими. Это помогает учитывать вклад разных позиций. Рейтинг складывается из шести показателей:</p>
          <div class="overflow-x-auto"><table class="w-full text-left text-xs"><thead class="bg-slate-50 text-slate-500"><tr><th class="p-2">Показатель</th><th class="p-2 text-right">Вес</th><th v-if="rating.components?.length" class="p-2 text-right">Процентиль</th></tr></thead><tbody><tr v-for="(metric,i) in metrics" :key="metric[0]" class="border-b border-slate-100"><td class="p-2">{{ metric[0] }}</td><td class="p-2 text-right font-bold text-slate-900">{{ metric[1] }}</td><td v-if="rating.components?.length" class="p-2 text-right text-blue-700">{{ rating.components[i] ?? '—' }}</td></tr></tbody></table></div>
          <p v-if="rating.components?.length" class="text-xs">Процентиль показывает место среди игроков своей роли по этому показателю: 90 означает, что результат выше примерно 90% группы. Равные показатели делят оценку.</p>
          <p>Для малой выборки рейтинг приближается к нейтральным 80 OVR: один яркий матч не делает игрока лучшим в лиге. Чем больше сыграно минут, тем сильнее влияет статистика сезона. Пока матчей нет — предварительные 80 OVR.</p>
          <p v-if="rating.confidence !== undefined" class="rounded-xl bg-blue-50 p-3 text-blue-900">Матчей в расчёте: <strong>{{ rating.gamesPlayed || 0 }}</strong>. Вес сезонных данных после поправки на выборку: <strong>{{ rating.confidence }}%</strong>.</p>
          <p>Рейтинг фиксируется для игрового дня до первого матча и одинаков для всех пользователей. В «Баланс-фентези» сумма пяти OVR не должна превышать 410. В режиме «Без ограничений» лимита нет.</p>
          <p>OVR не зависит от вашего личного уровня игрока. Уровень растёт за накопленный опыт в составах профиля, а OVR отражает реальные показатели сезона. Оценка защитного вклада здесь основана на перехватах и блоках; она не описывает все аспекты игры в защите.</p>
          <details class="rounded-xl bg-slate-50 p-3"><summary class="cursor-pointer font-bold text-slate-800">Подробная формула</summary><div class="mt-2 space-y-2 break-words text-xs leading-5"><p>Сначала переводим показатели в процентили от 0 до 1 внутри роли и складываем с указанными весами. Передачи учитываются как AST − 0,8 × TO за матч.</p><p>Эффективность: TS = (PTS сезона / 2 + 50 × 0,57) / (FGA сезона + 0,44 × FTA сезона + 50). Это сглаживает случайно высокую точность при малом числе бросков.</p><p>C = минуты сезона / (минуты сезона + 150). Итог: округление(60 + 39 × (0,5 + C × (суммарная оценка − 0,5))), в пределах 60–99.</p><p>Источник: статистика регулярного сезона ESPN. До фиксации игрового дня данные могут кешироваться до 15 минут. При недостаточной группе роли сравниваем со всей доступной лигой.</p></div></details>
        </div>
        <button type="button" class="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700" @click="close">Понятно</button>
      </section>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import {nextTick,onUnmounted,ref,useId} from 'vue'
import type {Rating} from './types'
defineOptions({inheritAttrs:false})
defineProps<{rating:Partial<Rating>;name?:string}>()
const metrics=[['Очки за матч','25%'],['Минуты за матч','10%'],['Эффективность бросков · TS','20%'],['Передачи с учётом потерь','20%'],['Подборы за матч','15%'],['Перехваты + блоки за матч','10%']]
const open=ref(false),dialog=ref<HTMLElement|null>(null),trigger=ref<HTMLButtonElement|null>(null),titleId=useId()
let overflow=''
async function show(){overflow=document.body.style.overflow;document.body.style.overflow='hidden';open.value=true;await nextTick();dialog.value?.focus()}
function close(){if(!open.value)return;open.value=false;document.body.style.overflow=overflow;trigger.value?.focus()}
function trap(event:KeyboardEvent){
  if(event.key!=='Tab'||!dialog.value)return
  const items=[...dialog.value.querySelectorAll<HTMLElement>('button,summary,a[href]')],first=items[0],last=items.at(-1)
  if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.value)){event.preventDefault();last?.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
}
onUnmounted(()=>{if(open.value)document.body.style.overflow=overflow})
</script>
