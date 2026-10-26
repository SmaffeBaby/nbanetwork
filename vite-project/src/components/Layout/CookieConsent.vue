<template>
  <div
    v-if="isVisible"
    class="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6"
    role="dialog"
    aria-live="polite"
    aria-label="Cookie consent"
  >
    <div class="mx-auto max-w-screen-lg rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-2xl sm:p-5">
      <div class="gap-5 md:flex md:items-start md:justify-between">
        <div class="max-w-3xl">
          <h2 class="text-lg font-black text-gray-950">Cookies и локальное хранение</h2>
          <p class="mt-2 text-sm leading-6 text-gray-600">
            Сайт использует необходимые cookies и localStorage, чтобы сохранять настройки интерфейса,
            сессию авторизации, избранные команды и согласие на cookies. Аналитические cookies включаются
            только после согласия.
          </p>
          <RouterLink to="/legal/cookie-policy" class="mt-3 inline-flex text-sm font-bold text-blue-700 hover:underline">
            Подробнее в Cookie Policy
          </RouterLink>
        </div>

        <div class="mt-5 shrink-0 space-y-3 md:mt-0 md:w-64">
          <label class="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
            <input
              v-model="analyticsAccepted"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-600"
            />
            <span>
              <span class="block font-bold text-gray-950">Аналитика</span>
              Помогает улучшать проект без продажи персональных данных.
            </span>
          </label>

          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              @click="saveConsent(false)"
            >
              Только нужные
            </button>
            <button
              type="button"
              class="rounded-lg bg-gray-950 px-3 py-2 text-sm font-bold text-white hover:bg-gray-800"
              @click="saveConsent(true)"
            >
              Принять
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useCookieConsent } from '../../composables/Layout/useCookieConsent'

const { isVisible, analyticsAccepted, saveConsent } = useCookieConsent()
</script>
