<template>
  <div>
    <button
        type="button"
        class="text-white bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-purple-300 dark:focus:ring-purple-800 font-medium rounded-base text-sm px-4 py-2.5 text-center leading-5"
        @click="open"
    >
      Редактировать прогресс
    </button>

    <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="close"
    >
      <section class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-black text-gray-900">Правила прогресса</h2>
            <p class="mt-1 text-sm font-medium text-gray-500">
              Настройте подписи и SVG для общего прогресса просмотров и любимой по просмотрам команды.
            </p>
          </div>

          <button
              type="button"
              class="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
              @click="close"
          >
            Закрыть
          </button>
        </div>

        <p v-if="error" class="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
          {{ error }}
        </p>

        <form class="mt-6 grid gap-4 lg:grid-cols-2" @submit.prevent="submit">
          <label class="space-y-1 text-sm font-semibold text-gray-700">
            Тип
            <select v-model="form.category" class="w-full rounded-xl border border-gray-200 px-3 py-2">
              <option value="watched_games">Просмотренные матчи</option>
              <option value="top_team">Команда с максимумом просмотров</option>
            </select>
          </label>

          <label class="space-y-1 text-sm font-semibold text-gray-700">
            До скольких игр
            <input
                v-model.number="form.max_games"
                type="number"
                min="1"
                required
                class="w-full rounded-xl border border-gray-200 px-3 py-2"
            >
          </label>

          <label class="space-y-1 text-sm font-semibold text-gray-700">
            Подпись
            <input
                v-model="form.title"
                type="text"
                required
                placeholder="Новичок"
                class="w-full rounded-xl border border-gray-200 px-3 py-2"
            >
          </label>

          <label class="space-y-1 text-sm font-semibold text-gray-700">
            SVG
            <input
                type="file"
                accept=".svg,image/svg+xml"
                class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                @change="readSvg"
            >
          </label>

          <label class="space-y-1 text-sm font-semibold text-gray-700 lg:col-span-2">
            Описание
            <textarea
                v-model="form.description"
                rows="3"
                placeholder="До 10 просмотренных матчей"
                class="w-full rounded-xl border border-gray-200 px-3 py-2"
            ></textarea>
          </label>

          <div class="flex flex-wrap items-center gap-3 lg:col-span-2">
            <button
                type="submit"
                :disabled="saving"
                class="rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ form.id ? 'Сохранить' : 'Добавить' }}
            </button>

            <button
                v-if="form.id"
                type="button"
                class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
                @click="resetForm"
            >
              Новое правило
            </button>

            <button
                v-if="form.svg"
                type="button"
                class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
                @click="form.svg = null"
            >
              Убрать SVG
            </button>
          </div>
        </form>

        <div class="mt-6 grid gap-3 md:grid-cols-2">
          <article
              v-for="rule in rules"
              :key="rule.id"
              class="rounded-xl border border-gray-200 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-xs font-bold uppercase text-gray-500">
                  {{ categoryLabel(rule.category) }} до {{ rule.max_games }} игр
                </div>
                <h3 class="mt-1 text-lg font-black text-gray-900">{{ rule.title }}</h3>
                <p class="mt-1 text-sm text-gray-500">{{ rule.description || 'Без описания' }}</p>
              </div>

              <img
                  v-if="rule.svg"
                  :src="svgSrc(rule.svg)"
                  :alt="rule.title"
                  class="h-12 w-12 object-contain"
              >
            </div>

            <div class="mt-4 flex gap-2">
              <button
                  type="button"
                  class="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
                  @click="editRule(rule)"
              >
                Изменить
              </button>

              <button
                  type="button"
                  :disabled="saving"
                  class="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="deleteRule(rule.id)"
              >
                Удалить
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type {
  ProfileProgressCategory,
  ProfileProgressRule,
  ProfileProgressRulePayload
} from '../../../composables/NBA/PublicProfile/useProfileProgressRules'

const props = defineProps<{
  rules: ProfileProgressRule[]
  saving: boolean
  error: string | null
  saveRule: (payload: ProfileProgressRulePayload) => Promise<boolean>
  deleteRule: (id: string) => Promise<boolean>
}>()

const isOpen = ref(false)

const form = reactive<ProfileProgressRulePayload>({
  category: 'watched_games',
  max_games: 10,
  title: '',
  description: '',
  svg: null
})

const open = () => {
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const resetForm = () => {
  delete form.id
  form.category = 'watched_games'
  form.max_games = 10
  form.title = ''
  form.description = ''
  form.svg = null
}

const submit = async () => {
  const saved = await props.saveRule({ ...form })
  if (saved) resetForm()
}

const editRule = (rule: ProfileProgressRule) => {
  form.id = rule.id
  form.category = rule.category
  form.max_games = rule.max_games
  form.title = rule.title
  form.description = rule.description
  form.svg = rule.svg
}

const deleteRule = async (id: string) => {
  const deleted = await props.deleteRule(id)
  if (deleted && form.id === id) resetForm()
}

const readSvg = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  form.svg = await file.text()
  input.value = ''
}

const svgSrc = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const categoryLabel = (category: ProfileProgressCategory) =>
  category === 'watched_games' ? 'Просмотры' : 'Топ-команда'
</script>
