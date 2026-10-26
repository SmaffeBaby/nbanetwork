<template>
  <div class="flex min-h-[48px] items-center justify-center">

    <div
        v-if="user"
        class="flex h-[48px] w-[224px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-blue-100 hover:bg-slate-50 hover:shadow-md"
        @click="goToProfile"
    >
      <img
          v-if="user.avatarImg"
          :src="user.avatarImg"
          alt="User avatar"
          class="h-9 w-9 shrink-0 rounded-full object-cover"
      />
      <div
          v-else
          class="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 via-indigo-500 to-sky-400"
      >
        <span class="text-sm font-black text-white">{{ userInitials }}</span>
      </div>

      <div class="min-w-0 flex-1 text-left">
        <p class="truncate text-sm font-extrabold leading-5 text-slate-950">
          {{ user.firstName }} {{ user.lastName }}
        </p>
        <p class="truncate text-xs font-medium leading-4 text-slate-500">{{ user.email }}</p>
      </div>

      <button
          @click.stop="handleLogout"
          class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 active:scale-95 transition"
          style="display: none"
      >
        Выйти
      </button>
    </div>

    <template v-else-if="loadingUser">
    </template>

    <template v-else>

    <div v-if="showForm === ''" class="flex items-center gap-3">
      <button
          @click="showForm = 'login'"
          class="inline-flex h-[48px] items-center justify-center rounded-lg px-[8px] text-[16px] font-bold text-slate-800 transition hover:text-blue-700 active:scale-95 2xl:px-[12px]"
      >
        Войти
      </button>

      <button
          @click="showForm = 'register'"
          class="inline-flex h-[48px] items-center justify-center rounded-lg bg-blue-700 px-[16px] text-[16px] font-extrabold text-white shadow-sm transition hover:bg-blue-800 active:scale-95 2xl:px-[24px]"
      >
        Регистрация
      </button>
    </div>

    <Teleport to="body">
      <div
          v-if="showForm === 'login'"
          @click.self="showForm = ''"
          class="fixed inset-0 flex items-center justify-center bg-black/50 z-[9999]"
      >
        <div class="w-80 bg-white rounded-2xl shadow-xl border p-6 space-y-4">

          <h2 class="text-2xl font-bold text-center">Вход</h2>

          <input
              v-model="email"
              type="email"
              placeholder="Email"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <input
              v-model="password"
              type="password"
              placeholder="Пароль"
              class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <div class="flex gap-2">
            <button
                @click="handleLogin"
                class="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition"
            >
              Войти
            </button>

            <button
                @click="sendPasswordReset"
                class="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 active:scale-95 transition"
            >
              Сброс
            </button>
          </div>

          <button
              @click="showForm = 'register'"
              class="w-full py-2 border rounded-lg hover:bg-green-600 hover:text-white transition"
          >
            Регистрация
          </button>

          <button
              @click="showForm = ''"
              class="w-full text-gray-500 hover:text-gray-700"
          >
            Закрыть
          </button>

        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
          v-if="showForm === 'register'"
          @click.self="showForm = ''"
          class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      >
        <div class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-white p-6 shadow-xl">

          <h2 class="text-2xl font-bold text-center">Регистрация</h2>

          <div class="mt-4 space-y-4">
            <input v-model="firstName" type="text" placeholder="Имя" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"/>
            <input v-model="lastName" type="text" placeholder="Фамилия" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"/>
            <input v-model="email" type="email" placeholder="Email" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"/>
            <input v-model="password" type="password" placeholder="Пароль" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"/>
          </div>

          <div class="mt-5 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left">
            <p class="text-sm font-black text-gray-950">Перед регистрацией подтвердите согласие</p>
            <p class="text-xs leading-5 text-gray-600">
              NBA MOM держится на уважении к людям и баскетболу: без политической агитации, пропаганды,
              оскорблений, травли, дискриминации и провокационных материалов. Нарушения в новостях,
              комментариях и профиле могут привести к удалению контента и бану аккаунта.
            </p>

            <label v-for="item in consentItems" :key="item.model" class="flex items-start gap-3 text-sm leading-5 text-gray-700">
              <input
                  v-model="consentModels[item.model].value"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span>
                {{ item.text }}
                <RouterLink :to="item.to" target="_blank" class="font-bold text-blue-700 hover:underline">
                  {{ item.linkText }}
                </RouterLink>
              </span>
            </label>
          </div>

          <div class="mt-5 flex gap-2">
            <button
                @click="handleRegister"
                class="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:scale-95 transition"
            >
              Зарегистрироваться
            </button>

            <button
                @click="showForm = 'login'"
                class="flex-1 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 active:scale-95 transition"
            >
              Назад
            </button>
          </div>

        </div>
      </div>
    </Teleport>

    </template>

  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthPanel } from '../../composables/Auth/useAuthPanel.ts'

const {
  email,
  password,
  firstName,
  lastName,
  consentItems,
  consentModels,
  user,
  showForm,
  handleLogin,
  handleRegister,
  handleLogout,
  sendPasswordReset,
  goToProfile,
  loadingUser,
  userInitials
} = useAuthPanel()
</script>
