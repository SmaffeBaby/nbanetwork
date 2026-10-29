<template>
  <div v-if="auth.user">
    <button type="button" :aria-label="hidden ? 'Счёт скрыт. Показать счёт' : 'Счёт показан. Скрыть счёт'" :title="hidden ? 'Счёт скрыт' : 'Счёт показан'" :aria-pressed="!hidden" aria-haspopup="dialog" :disabled="auth.loading || saving" class="inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" :class="hidden ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'" @click="ask">
      <EyeSlashIcon v-if="hidden" class="h-6 w-6" aria-hidden="true" /><EyeIcon v-else class="h-6 w-6" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" @click.self="close" @keydown.esc.stop="close">
        <section ref="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="descriptionId" tabindex="-1" class="w-full max-w-md rounded-3xl bg-white p-5 text-left shadow-2xl focus:outline-none sm:p-7">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><EyeSlashIcon v-if="nextHidden" class="h-7 w-7" aria-hidden="true" /><EyeIcon v-else class="h-7 w-7" aria-hidden="true" /></div>
          <h2 :id="titleId" class="text-xl font-black text-slate-900">{{ nextHidden ? 'Скрыть счёт матчей?' : 'Показать счёт матчей?' }}</h2>
          <p :id="descriptionId" class="mt-3 text-sm leading-6 text-slate-500">{{ nextHidden ? 'Результаты матчей будут скрыты во всех разделах сайта. Продолжить?' : 'Результаты матчей станут видны во всех разделах сайта. Продолжить?' }}</p>
          <p v-if="error" role="alert" class="mt-3 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">{{ error }}</p>
          <div class="mt-6 grid grid-cols-2 gap-3"><button type="button" class="min-h-11 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50" :disabled="saving" @click="close">Отмена</button><button type="button" class="min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50" :disabled="saving" @click="confirm">{{ saving ? 'Сохраняем…' : nextHidden ? 'Да, скрыть' : 'Да, показать' }}</button></div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '../../stores/auth'
const auth = useAuthStore(), hidden = computed(() => auth.user?.hideScores !== false)
const open = ref(false), nextHidden = ref(true), saving = ref(false), error = ref(''), dialog = ref<HTMLElement | null>(null)
const titleId = useId(), descriptionId = useId()
let ownerId = '', previousFocus: HTMLElement | null = null, previousOverflow = ''
function ask() { if (!auth.user || auth.loading) return; ownerId = auth.user.id; nextHidden.value = !hidden.value; error.value = ''; open.value = true }
function close() { if (!saving.value) open.value = false }
async function confirm() {
  if (saving.value || auth.user?.id !== ownerId) return
  saving.value = true; error.value = ''
  try {
    if (!await auth.updateHideScores(nextHidden.value)) throw new Error('not saved')
    open.value = false
  } catch { error.value = 'Не удалось сохранить настройку. Попробуйте ещё раз.' }
  finally { saving.value = false }
}
function trap(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value) return
  const items = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled)')], first = items[0], last = items.at(-1)
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
function restore() { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', trap); previousFocus?.focus() }
watch(open, async value => {
  if (!value) { restore(); return }
  previousFocus = document.activeElement as HTMLElement; previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', trap)
  await nextTick(); dialog.value?.focus()
})
watch(() => auth.user?.id, () => { open.value = false })
onUnmounted(() => { if (open.value) restore() })
</script>
