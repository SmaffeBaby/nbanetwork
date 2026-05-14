<template>
  <div class="sm:hidden fixed top-4 right-4 z-50">
    <button
        class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/50 bg-white/70 text-slate-900 shadow-lg shadow-slate-900/10 backdrop-blur-xl transition hover:bg-white/85 focus:outline-none focus:ring-4 focus:ring-blue-100"
        type="button"
        aria-controls="drawer-navigation"
        :aria-expanded="isOpen"
        @click="openDrawer"
    >
      <svg class="h-6 w-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5 7h14M5 12h14M5 17h14"/>
      </svg>
      <span class="sr-only">Открыть меню</span>
    </button>
  </div>

  <Transition name="drawer-fade">
    <div
        v-if="isOpen"
        class="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm sm:hidden"
        aria-hidden="true"
        @click="closeDrawer"
    />
  </Transition>

  <aside
      id="drawer-navigation"
      class="drawer-gradient fixed left-0 top-0 z-50 h-screen w-80 max-w-[86vw] overflow-y-auto border-e border-white/45 p-4 text-left shadow-2xl shadow-slate-950/20 backdrop-blur-2xl transition-transform duration-300 sm:hidden"
      :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
      tabindex="-1"
      aria-labelledby="drawer-navigation-label"
  >
    <div class="relative mt-6 flex min-h-20 items-center border-b border-white/45 pb-4">
      <RouterLink to="/" class="flex min-w-0 items-center" @click="closeDrawer">
        <img
            id="drawer-navigation-label"
            src="/logos/logo-nba-mom.svg"
            class="h-auto w-[220px] max-w-[calc(100%-4.25rem)] object-contain object-left"
            alt="NBA MOM Logo"
        />
      </RouterLink>

      <div v-if="user" class="mobile-notifications absolute right-1 top-2">
        <NotificationsBell />
      </div>


    </div>

    <div v-if="user" class="mt-5 rounded-xl border border-white/60 bg-white/50 p-3 shadow-sm shadow-slate-900/5 backdrop-blur-xl">
      <RouterLink to="/profile" class="flex min-w-0 items-center gap-3" @click="closeDrawer">
        <img
            v-if="user.avatarImg"
            :src="user.avatarImg"
            alt="Аватар пользователя"
            class="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-md ring-2 ring-blue-100"
        />
        <div
            v-else
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-500 to-sky-400 text-sm font-black text-white shadow-md ring-2 ring-blue-100"
        >
          {{ userInitials }}
        </div>

        <div class="min-w-0">
          <p class="truncate text-sm font-bold text-slate-950">{{ userName }}</p>
          <p class="truncate text-xs text-slate-600">{{ user.email }}</p>
        </div>
      </RouterLink>

      <button
          class="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200"
          type="button"
          @click="logoutFromDrawer"
      >
        Выйти
      </button>
    </div>

    <div v-else-if="!loadingUser" class="mt-5 rounded-xl border border-white/60 bg-white/50 p-3 shadow-sm shadow-slate-900/5 backdrop-blur-xl">
      <p class="text-sm font-bold text-slate-950">Войдите в аккаунт</p>
      <p class="mt-1 text-xs leading-5 text-slate-600">Профиль, избранные команды и уведомления будут под рукой.</p>
      <button
          class="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          type="button"
          @click="showForm = 'login'"
      >
        Войти
      </button>
    </div>

    <nav class="py-5">
      <ul class="space-y-2 font-medium">
        <li v-for="item in primaryLinks" :key="item.label">
          <RouterLink
              :to="item.to"
              class="group flex items-center rounded-lg px-2 py-2 text-slate-800 transition hover:bg-white/65 hover:text-blue-700 hover:shadow-sm"
              :class="{ 'bg-white/70 text-blue-700 shadow-sm': item.isActive }"
              @click="closeDrawer"
          >
            <component :is="item.icon" class="h-5 w-5 shrink-0 transition group-hover:text-blue-700" />
            <span class="ms-3">{{ item.label }}</span>
          </RouterLink>
        </li>

        <li>
          <RouterLink
              :to="gamesPath"
              class="group flex items-center rounded-lg px-2 py-2 text-slate-800 transition hover:bg-white/65 hover:text-blue-700 hover:shadow-sm"
              :class="{ 'bg-white/70 text-blue-700 shadow-sm': route.path.startsWith('/games') }"
              @click="closeDrawer"
          >
            <CalendarIcon class="h-5 w-5 shrink-0 transition group-hover:text-blue-700" />
            <span class="ms-3">Игры</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="mt-auto border-t border-white/45 pt-4">
      <RouterLink
          to="/patch-note"
          class="group flex items-center rounded-lg px-2 py-2 text-slate-700 transition hover:bg-white/65 hover:text-blue-700 hover:shadow-sm"
          :class="{ 'bg-white/70 text-blue-700 shadow-sm': route.path === '/patch-note' }"
          @click="closeDrawer"
      >
        <SparklesIcon class="h-5 w-5 shrink-0 transition group-hover:text-blue-700" />
        <span class="ms-3 flex-1 whitespace-nowrap">Обновления</span>
      </RouterLink>

      <div class="mt-4 flex items-center gap-4 px-2">
        <a
            :href="githubUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/55 bg-white/45 text-slate-600 shadow-sm backdrop-blur-xl transition hover:bg-white/70 hover:text-slate-950"
        >
          <svg class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M12.006 2a9.847 9.847 0 0 0-6.484 2.44 10.32 10.32 0 0 0-3.393 6.17 10.48 10.48 0 0 0 1.317 6.955 10.045 10.045 0 0 0 5.4 4.418c.504.095.683-.223.683-.494 0-.245-.01-1.052-.014-1.908-2.78.62-3.366-1.21-3.366-1.21a2.711 2.711 0 0 0-1.11-1.5c-.907-.637.07-.621.07-.621.317.044.62.163.885.346.266.183.487.426.647.71.135.253.318.476.538.655a2.079 2.079 0 0 0 2.37.196c.045-.52.27-1.006.635-1.37-2.219-.259-4.554-1.138-4.554-5.07a4.022 4.022 0 0 1 1.031-2.75 3.77 3.77 0 0 1 .096-2.713s.839-.275 2.749 1.05a9.26 9.26 0 0 1 5.004 0c1.906-1.325 2.74-1.05 2.74-1.05.37.858.406 1.828.101 2.713a4.017 4.017 0 0 1 1.029 2.75c0 3.939-2.339 4.805-4.564 5.058a2.471 2.471 0 0 1 .679 1.897c0 1.372-.012 2.477-.012 2.814 0 .272.18.592.687.492a10.05 10.05 0 0 0 5.388-4.421 10.473 10.473 0 0 0 1.313-6.948 10.32 10.32 0 0 0-3.39-6.165A9.847 9.847 0 0 0 12.007 2Z" clip-rule="evenodd" />
          </svg>
          <span class="sr-only">GitHub account</span>
        </a>

        <a
            :href="telegramUrl"
            target="_blank"
            rel="noreferrer"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/55 bg-white/45 text-slate-600 shadow-sm backdrop-blur-xl transition hover:bg-white/70 hover:text-slate-950"
        >
          <svg class="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.8 4.2 18.6 19c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 12.5 1.1 11c-1.1-.3-1.1-1.1.2-1.6L20.3 2c.9-.3 1.7.2 1.5 2.2Z" />
          </svg>
          <span class="sr-only">Telegram channel</span>
        </a>
      </div>
    </div>
  </aside>

  <Teleport to="body">
    <div
        v-if="showForm === 'login'"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
        @click.self="showForm = ''"
    >
      <div class="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-xl">
        <h2 class="text-center text-2xl font-bold text-slate-950">Вход</h2>

        <div class="mt-5 space-y-3">
          <input v-model="email" type="email" placeholder="Email" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          <input v-model="password" type="password" placeholder="Пароль" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500" />
        </div>

        <div class="mt-4 flex gap-2">
          <button class="flex-1 rounded-lg bg-blue-600 py-2 text-white transition hover:bg-blue-700" @click="loginFromDrawer">Войти</button>
          <button class="flex-1 rounded-lg bg-slate-200 py-2 text-slate-800 transition hover:bg-slate-300" @click="sendPasswordReset">Сброс</button>
        </div>

        <button class="mt-3 w-full rounded-lg border py-2 text-slate-700 transition hover:bg-green-600 hover:text-white" @click="showForm = 'register'">
          Регистрация
        </button>

        <button class="mt-3 w-full text-sm text-slate-500 hover:text-slate-700" @click="showForm = ''">Закрыть</button>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
        v-if="showForm === 'register'"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
        @click.self="showForm = ''"
    >
      <div class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-white p-6 shadow-xl">
        <h2 class="text-center text-2xl font-bold text-slate-950">Регистрация</h2>

        <div class="mt-5 space-y-3">
          <input v-model="firstName" type="text" placeholder="Имя" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-green-500" />
          <input v-model="lastName" type="text" placeholder="Фамилия" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-green-500" />
          <input v-model="email" type="email" placeholder="Email" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-green-500" />
          <input v-model="password" type="password" placeholder="Пароль" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-green-500" />
        </div>

        <div class="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-sm font-black text-slate-950">Перед регистрацией подтвердите согласие</p>
          <p class="text-xs leading-5 text-slate-600">
            NBA MOM держится на уважении к людям и баскетболу: без политической агитации, пропаганды,
            оскорблений, травли, дискриминации и провокационных материалов.
          </p>

          <label v-for="item in consentItems" :key="item.model" class="flex items-start gap-3 text-sm leading-5 text-slate-700">
            <input
                v-model="consentModels[item.model].value"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
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
          <button class="flex-1 rounded-lg bg-green-600 py-2 text-white transition hover:bg-green-700" @click="registerFromDrawer">Зарегистрироваться</button>
          <button class="flex-1 rounded-lg bg-slate-200 py-2 text-slate-800 transition hover:bg-slate-300" @click="showForm = 'login'">Назад</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import NotificationsBell from './NotificationsBell.vue'
import { useHeaderBurger } from '../../composables/Headers/useHeaderBurger'

const {
  CalendarIcon,
  closeDrawer,
  consentItems,
  consentModels,
  email,
  firstName,
  gamesPath,
  githubUrl,
  isOpen,
  lastName,
  loadingUser,
  loginFromDrawer,
  logoutFromDrawer,
  openDrawer,
  password,
  primaryLinks,
  registerFromDrawer,
  route,
  sendPasswordReset,
  showForm,
  SparklesIcon,
  telegramUrl,
  user,
  userInitials,
  userName
} = useHeaderBurger()
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-gradient {
  background:
    radial-gradient(circle at 18% 8%, #ffffffd9 0 18%, #0000 38%),
    radial-gradient(circle at 95% 12%, #60a5fa6b 0 18%, #0000 42%),
    radial-gradient(circle at 12% 62%, #ffffff47 0 20%, #0000 48%),
    linear-gradient(145deg, #ffffffbd 0%, #dbeafe9e 42%, #e0e7ff94 70%, #f0f9ffad 100%);
}

.mobile-notifications :deep(button) {
  border-color: rgb(255 255 255 / 0.55);
  background: linear-gradient(145deg, rgb(255 255 255 / 0.72), rgb(219 234 254 / 0.58));
  color: rgb(15 23 42);
  box-shadow: 0 8px 20px rgb(15 23 42 / 0.08);
  backdrop-filter: blur(18px);
}

.mobile-notifications :deep(button:hover) {
  background: linear-gradient(145deg, rgb(255 255 255 / 0.86), rgb(191 219 254 / 0.7));
}

.mobile-notifications :deep(.absolute.right-0) {
  border-color: rgb(255 255 255 / 0.6);
  background:
    radial-gradient(circle at 0 0, rgb(191 219 254 / 0.38), transparent 38%),
    linear-gradient(145deg, rgb(255 255 255 / 0.88), rgb(239 246 255 / 0.82));
  color: rgb(15 23 42);
  backdrop-filter: blur(24px);
}
</style>
