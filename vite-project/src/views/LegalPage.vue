<template>
  <div class="min-h-screen bg-gray-50 px-4 pb-16 pt-28 sm:px-8 sm:pt-40">
    <Header />

    <main class="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm sm:p-8">
      <p class="text-sm font-bold uppercase tracking-wide text-blue-700">Правовая информация</p>
      <h1 class="mt-3 text-3xl font-black leading-tight text-gray-950 sm:text-4xl">
        {{ page.title }}
      </h1>
      <p class="mt-4 text-sm leading-6 text-gray-600">
        {{ page.lead }}
      </p>

      <div class="mt-8 space-y-7">
        <section v-for="section in page.sections" :key="section.title">
          <h2 class="text-xl font-black text-gray-950">{{ section.title }}</h2>
          <p class="mt-2 text-base leading-7 text-gray-700">{{ section.body }}</p>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import Header from '../components/Headers/Header.vue'
import { useLegalPage } from '../composables/Legal/useLegalPage'

const { page } = useLegalPage()
</script>
