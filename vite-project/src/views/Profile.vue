<template>
  <Header />
  <div class="p-4">
    <h1 class="text-2xl font-bold">Профиль пользователя</h1>
    <p>Email: {{ user?.email }}</p>
    <p>Имя: {{ user?.firstName }}</p>
    <p>Фамилия: {{ user?.lastName }}</p>

    <button
        @click.stop="handleLogout"
        class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 active:scale-95 transition"
    >
      Выйти
    </button>
  </div>
</template>

<script setup lang="ts">
import Header from "../components/Header.vue"
import { useAuthPanel } from '../composables/Auth/useAuthPanel.ts'
import { useRouter } from 'vue-router'
import { onMounted, watch } from 'vue'

const { user, handleLogout } = useAuthPanel()
const router = useRouter()

const logoutAndRedirect = async () => {
  await handleLogout()
}

onMounted(() => {
  if (!user.value) {
    router.replace('/')
  }
})


watch(user, (newVal) => {
  if (!newVal) {
    router.replace('/')
  }
})
</script>