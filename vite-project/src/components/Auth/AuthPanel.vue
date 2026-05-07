<template>
  <div class="flex items-center justify-center min-h-[52px]">

    <div
        v-if="user"
        class="flex items-center gap-3 w-56 rounded-xl p-3 bg-white shadow-md border cursor-pointer hover:shadow-lg transition"
        @click="goToProfile"
    >
      <img
          v-if="user.avatarImg"
          :src="user.avatarImg"
          alt="User avatar"
          class="w-10 h-10 rounded-full object-cover"
      />
      <div
          v-else
          class="relative inline-flex items-center justify-center w-10 h-10 overflow-hidden bg-gray-100 rounded-full shrink-0"
      >
        <span class="font-medium text-gray-600">{{ userInitials }}</span>
      </div>

      <div class="min-w-0 text-left">
        <p class="text-sm font-bold text-black truncate">
          {{ user.firstName }} {{ user.lastName }}
        </p>
        <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
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

    <button
        v-if="showForm === ''"
        @click="showForm = 'login'"
        class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 active:scale-95 transition"
    >
      Войти
    </button>

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
          class="fixed inset-0 flex items-center justify-center bg-black/50 z-[9999]"
      >
        <div class="w-80 bg-white rounded-2xl shadow-xl border p-6 space-y-4">

          <h2 class="text-2xl font-bold text-center">Регистрация</h2>

          <input v-model="firstName" type="text" placeholder="Имя" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"/>
          <input v-model="lastName" type="text" placeholder="Фамилия" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"/>
          <input v-model="email" type="email" placeholder="Email" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"/>
          <input v-model="password" type="password" placeholder="Пароль" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"/>

          <div class="flex gap-2">
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
import { computed } from 'vue'
import { useAuthPanel } from '../../composables/Auth/useAuthPanel.ts'

const {
  email,
  password,
  firstName,
  lastName,
  user,
  showForm,
  handleLogin,
  handleRegister,
  handleLogout,
  sendPasswordReset,
  goToProfile,
  loadingUser
} = useAuthPanel()

const userInitials = computed(() => {
  const first = user.value?.firstName?.trim().charAt(0) ?? ''
  const last = user.value?.lastName?.trim().charAt(0) ?? ''
  const initials = `${first}${last}`.trim()

  return initials || 'U'
})
</script>